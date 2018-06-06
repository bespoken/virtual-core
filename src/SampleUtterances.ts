import {IIntentSchema} from "./IIntentSchema";
import {IModel} from "./IModel";
import {SlotMatch, SlotTypes} from "./SlotTypes";

export class SampleUtterances {
    private _interactionModel: IModel;

    private samples: {[id: string]: SamplePhrase[]} = {};

    // This is its own method, because it needs to be called at a particular point in initialization
    // We call it after loading the sample utterances and intents, while initializing the interaction model
    // Once we have the interaction model, we go back in add the builtin utterances
    public setInteractionModel(interactionModel: IModel) {
        this._interactionModel = interactionModel;
    }

    public interactionModel(): IModel {
        return this._interactionModel;
    }

    public addSample(intent: string, sample: string) {
        if (!(intent in this.samples)) {
            this.samples[intent] = [];
        }
        this.samples[intent].push(new SamplePhrase(this, intent, sample));
    }

    public samplesForIntent(intent: string): SamplePhrase [] {
        if (!(intent in this.samples)) {
            return [];
        }
        return this.samples[intent];
    }

    /**
     * To handle the case when what is said does not match any sample utterance
     */
    public defaultUtterance(): SamplePhrase {
        // Just grab the first sample for now
        const firstIntent = Object.keys(this.samples)[0];
        return this.samples[firstIntent][0];
    }
}

/**
 * Helper class for handling phrases - breaks out the slots within a phrase
 */
export class SamplePhrase {
    private slotNames: string[] = [];
    private _regex: string;

    public constructor(public sampleUtterances: SampleUtterances,
                       public intent: string,
                       public phrase: string) {
        this.phrase = phrase;
        this._regex = this.phraseToRegex(this.phrase);
    }

    public slotName(index: number): string | undefined {
        if (index >= this.slotNames.length) {
            return undefined;
        }

        return this.slotNames[index];
    }

    public slotCount(): number {
        return this.slotNames.length;
    }

    public regex(): RegExp {
        return new RegExp("^" + this._regex + "$", "i");
    }

    /**
     * Tests to see if the utterances matches the sample phrase
     * If it does, returns an array of matching slot values
     * If it does not, returns undefined
     * @param {string} utterance
     * @returns {[]}
     */
    public matchesUtterance(utterance: string): SamplePhraseTest {
        return new SamplePhraseTest(this, utterance);
    }

    /**
     * Takes a phrase like "This is a {Slot}" and turns it into a regex like "This is a(.*)"
     * This is so we can compare the sample utterances (which have names that tie off to the slot names defined in the
     *  intent schema) with the actual utterance, which have values in the slot positions (as opposed to the names)
     * @param phrase
     */
    private phraseToRegex(phrase: string): string {
        const startIndex = phrase.indexOf("{");
        if (startIndex !== -1) {
            const endIndex = phrase.indexOf("}", startIndex);
            const slotName = phrase.substring(startIndex + 1, endIndex);

            const pipe = slotName.indexOf("|");

            if(pipe === -1){
                this.slotNames.push(slotName);
                phrase = phrase.substring(0, startIndex).trim() + "(.*)" + phrase.substring(endIndex + 1).trim();
            } else{
                // Literal are in the format "sample { <literal sample> | <slotname>}"
                // e.g.: "I'm an {aquarius | literal}"
                const literalSample = slotName.substring(0, pipe);
                const literalSlotName = slotName.substring(pipe + 2, slotName.length);
                this.slotNames.push(literalSlotName);
                phrase = phrase.substring(0, startIndex).trim() + literalSample.trim() + phrase.substring(endIndex + 1).trim();
            }

            phrase = this.phraseToRegex(phrase);
        }

        // We make the regex lowercase, so that we match a phrase regardless of case
        // We only switch to lowercase here because if we change the slotnames to lowercase,
        //  it throws off the slot matching
        return phrase;
    }
}

export class SamplePhraseTest {
    private slotMatches: SlotMatch[];
    private matched = false;
    private matchString: string;

    public constructor(public samplePhrase: SamplePhrase, private utterance: string) {
        const cleanUtterance = utterance.replace(/[\!\"\¿\?|\#\$\%\/\(\)\=\+\-\_\<\>\*\{\}\·\¡\[\]\.\,\;\:]/g, "");
        const matchArray = cleanUtterance.match(samplePhrase.regex());

        this.matched = false;
        // If we have a regex match, check all the slots match their types
        if (matchArray) {
            const slotMatches = this.checkSlots(matchArray[0], matchArray.slice(1));
            if (slotMatches) {
                this.slotMatches = slotMatches;
                this.matched = true;
                this.matchString = matchArray[0];
            }
        }
    }

    public matches(): boolean {
        return this.matched;
    }

    // We assign a score based on the number of non-slot value letters that match
    public score(): number {
        let slotValueLength = 0;
        for (const slotValue of this.slotValues()) {
            slotValueLength += slotValue.length;
        }

        return this.matchString.length - slotValueLength;
    }

    public scoreSlots(): number {
        let typed = 0;
        for (const slotMatch of this.slotMatches) {
            if (!slotMatch.untyped) {
                typed++;
            }
        }

        return typed;
    }

    public slotValues(): string [] {
        const values = [];
        for (const slotMatch of this.slotMatches) {
            values.push(slotMatch.value);
        }
        return values;
    }

    private checkSlots(input: string, slotValues: string []): SlotMatch[] | undefined {
        // Build an array of results - we want to pass back the exact value that matched (not change the case)
        const result = [];
        let index = 0;

        // We check each slot value against valid values
        for (const slotValue of slotValues) {
            // If the whole of the match is not a slot, make sure there is a leading or trailing space on the slot
            // This is to avoid matching a sample like "sample {slot}" with "sampleslot"
            // Ideally, this would be done as a regex - seemingly possible, but the regex is very confusing
            if (input !== slotValue) {
                if (slotValue.trim().length > 0 && !slotValue.startsWith(" ") && !slotValue.endsWith(" ")) {
                    return undefined;
                }
            }

            const slotName = this.samplePhrase.slotName(index);
            // Look up the slot type for the name
            const slotType = this.intentSchema().intent(this.samplePhrase.intent).slotForName(slotName);
            if (!slotType) {
                throw new Error("Invalid schema - not slot: " + slotName + " for intent: " + this.samplePhrase.intent);
            }

            const slotMatch = this.slotTypes().matchesSlot(slotType.type, slotValue);
            if (!slotMatch.matches) {
                return undefined;

            } else {
                result.push(slotMatch);
            }
            index++;
        }

        return result;
    }

    private intentSchema(): IIntentSchema {
        return this.samplePhrase.sampleUtterances.interactionModel().intentSchema;
    }

    private slotTypes(): SlotTypes {
        return this.samplePhrase.sampleUtterances.interactionModel().slotTypes;
    }
}
