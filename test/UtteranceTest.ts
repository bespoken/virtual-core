import {assert} from "chai";
import {IIntentSchema, Intent, IntentSlot} from "../src/IIntentSchema";
import {IModel} from "../src/IModel";
import {SampleUtterances} from "../src/SampleUtterances";
import {SlotTypes} from "../src/SlotTypes";
import {Utterance} from "../src/Utterance";

const unpreparedIntentList = [
    {
        intent: "Play",
    },
    {
        intent: "Hello",
    },
    {
        intent: "NoSampleUtterances",
    },
    {
        intent: "SlottedIntent",
        slots: [
            {name: "SlotName", type: "SLOT_TYPE"},
        ],
    },
    {
        intent: "MultipleSlots",
        slots: [
            {name: "SlotA", type: "SLOT_TYPE"},
            {name: "SlotB", type: "SLOT_TYPE"},
        ],
    },
    {
        intent: "CustomSlot",
        slots: [
            {name: "country", type: "COUNTRY_CODE"},
        ],
    },
    {
        intent: "NumberSlot",
        slots: [
            {name: "number", type: "AMAZON.NUMBER"},
        ],
    },
    {
        intent: "StringSlot",
        slots: [
            {name: "stringSlot", type: "StringSlotType"},
        ],
    },
    {
        intent: "AMAZON.HelpIntent",
    },
];
const intentList: Intent[] = unpreparedIntentList.map((intent) => {
        const generatedIntent = new Intent(intent.intent, intent.intent.includes("AMAZON"));
        const casteIntent = intent as any;
        if (casteIntent.slots) {
            casteIntent.slots.forEach((slot: {name: string, type: string}) => {
                generatedIntent.addSlot(new IntentSlot(slot.name, slot.type));
            });
        }
        return generatedIntent;
    });

const intentSchema: IIntentSchema = {
    hasIntent: (intentString: string) => {
        return intentList.some((intent) => intentString === intent.name);
    },
    intent: (intentString: string) => {
       return intentList.find((intent) => intentString === intent.name);
    },
    intents: () => intentList,
};

const sampleUtterancesValues = {
    CustomSlot: ["{country}"],
    Hello: ["hi", "hello", "hi there", "good morning"],
    MultipleSlots: ["multiple {SlotA} and {SlotB}", "reversed {SlotB} then {SlotA}", "{SlotA}"],
    NumberSlot: ["{number}", "{number} test"],
    Play: ["play", "play next", "play now"],
    SlottedIntent: ["slot {SlotName}"],
    StringSlot: ["{stringSlot}"],
};

const slotTypes = [{
    name: "COUNTRY_CODE",
    values: [
        {
            id: "US",
            name: {
                synonyms: ["USA", "America", "US"],
                value: "US",
            },
        },
        {
            id: "DE",
            name: {
                synonyms: ["Germany", "DE"],
                value: "DE",
            },
        },
        {
            id: "UK",
            name: {
                synonyms: ["England", "Britain", "UK", "United Kingdom", "Great Britain"],
                value: "UK",
            },
        },
    ],
}];

const model: IModel = {
    hasIntent: (intentString: string) => {
        return intentList.some((intent) => intentString === intent.name);
    },
    intentSchema,
    sampleUtterances: null,
    slotTypes: new SlotTypes(slotTypes),
};

model.sampleUtterances = new SampleUtterances();

model.sampleUtterances.setInteractionModel(model);

Object.keys(sampleUtterancesValues).forEach((slotName) => {
        (sampleUtterancesValues as any)[slotName].forEach((sample: string) => {
        model.sampleUtterances.addSample(slotName, sample);
    });
});

describe("UtteranceTest", function() {
    describe("#matchIntent", () => {
        it("Matches a simple phrase", () => {
            const utterance = new Utterance(model, "play");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "Play");
        });

        it("Matches a simple phrase, ignores case", () => {
            const utterance = new Utterance(model, "Play");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "Play");
        });

        it("Matches a simple phrase, ignores special characters", () => {
            const utterance = new Utterance(model, "play?");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "Play");
        });

        it("Matches a slotted phrase", () => {
            const utterance = new Utterance(model, "slot value");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "SlottedIntent");
            assert.equal(utterance.slot(0), "value");
            assert.equal(utterance.slotByName("SlotName"), "value");
        });

        it("Matches a slotted phrase, no slot value", () => {
            const utterance = new Utterance(model, "slot");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "SlottedIntent");
        });

        it("Matches a phrase with multiple slots", () => {
            const utterance = new Utterance(model, "multiple a and b");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "MultipleSlots");
            assert.equal(utterance.slot(0), "a");
            assert.equal(utterance.slot(1), "b");
            assert.equal(utterance.slotByName("SlotA"), "a");
            assert.equal(utterance.slotByName("SlotB"), "b");
        });

        it("Matches a phrase with multiple slots reversed", () => {
            const utterance = new Utterance(model, "reversed a then b");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "MultipleSlots");
            assert.equal(utterance.slot(0), "a");
            assert.equal(utterance.slot(1), "b");
            assert.equal(utterance.slotByName("SlotA"), "b");
            assert.equal(utterance.slotByName("SlotB"), "a");
        });

        it("Matches a phrase with slot with enumerated values", () => {
            const utterance = new Utterance(model, "US");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "CustomSlot");
            assert.equal(utterance.slot(0), "US");
            assert.equal(utterance.slotByName("country"), "US");
        });

        it("Does not match a phrase with slot with enumerated values", () => {
            const utterance = new Utterance(model, "hi");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "Hello");
        });

        it("Matches a more specific phrase", () => {
            const utterance = new Utterance(model, "1900 test");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "NumberSlot");
        });

        it("Matches with symbols in the phrase", () => {
            const utterance = new Utterance(model, "good? #%.morning");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "Hello");
        });

        it("Matches with punctuation in the phrase", () => {
            const utterance = new Utterance(model, "good, -morning:");
            assert.isTrue(utterance.matched());
            assert.equal(utterance.intent(), "Hello");
        });
    });
});
