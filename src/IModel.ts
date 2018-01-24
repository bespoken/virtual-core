import {IIntentSchema} from "./IIntentSchema";
import {SampleUtterances} from "./SampleUtterances";
import {SlotTypes} from "./SlotTypes";

/**
 * Parses and interprets an interaction model
 * Needs to define a hasIntent for it to be validated in the Utterances validation
 * Then can take a phrase and create an intentName request based on it
 */
export interface IModel {
    slotTypes?: SlotTypes;
    hasIntent: (intent: string) => boolean;
    intentSchema: IIntentSchema;
    sampleUtterances: SampleUtterances;
}
