export class SlotTypes {
    public types: SlotType[];

    public constructor(slotTypes: ISlotType[]) {
        this.types = [];
        for (const type of slotTypes) {
            this.types.push(new SlotType(type.name, type.values));
        }
    }

    public addTypes(slotTypes: SlotType[]) {
        this.types = this.types.concat(slotTypes);
    }

    public slotType(name: string): SlotType {
        let slotType;
        name = name.toLowerCase();
        for (const o of this.types) {
            if (o.name.toLowerCase() === name) {
                slotType = o;
                break;
            }
        }

        return slotType;
    }

    public matchesSlot(name: string, value: string): SlotMatch {
        const slotType = this.slotType(name);
        // If no slot type definition is provided, we just assume it is a match
        if (!slotType) {
            const match = new SlotMatch(true, value);
            match.untyped = true;
            return match;
        }

        return slotType.match(value);
    }
}

export class SlotMatch {
    public untyped: boolean;
    public constructor(public matches: boolean,
                       public value?: string,
                       public enumeratedValue?: ISlotValue,
                       public slotValueSynonym?: string) {
        this.untyped = false;
    }
}

export class SlotType implements ISlotType {
    public constructor(public name: string, public values?: ISlotValue[]) {
        if (!values) {
            values = [];
        }
        for (const value of values) {
            // We default builtin to false
            if (value.builtin === undefined) {
                value.builtin = false;
            }
        }
    }

    public isEnumerated() {
        return !this.isBuiltin();
    }

    public isCustom() {
        let custom = false;
        if (this.isBuiltin()) {
            for (const value of this.values) {
                if (!value.builtin) {
                    custom = true;
                    break;
                }
            }
        } else {
            custom = true;
        }
        return custom;
    }

    public isBuiltin() {
        return this.name.startsWith("AMAZON");
    }

    public match(value: string): SlotMatch {
        const matches = this.matchAll(value);
        if (matches.length > 0) {
            return matches[0];
        } else if (this.isBuiltin() && !this.isEnumerated()) {
            // If this is a builtin, we still count it as a match, because we treat these as free form
            // Unless we explicilty have enumerated the builtin - we have rarely done this so far
            return new SlotMatch(true, value);
        }
        return new SlotMatch(false);
    }

    public matchAll(value: string): SlotMatch[] {
        value = value.trim();
        const matches: SlotMatch[] = [];

        for (const slotValue of this.values) {
            // First check the name value - the value and the synonyms are both valid matches
            // Refer here for definitive rules:
            //  https://developer.amazon.com/docs/custom-skills/
            //      define-synonyms-and-ids-for-slot-type-values-entity-resolution.html
            if (slotValue.name.value.toLowerCase() === value.toLowerCase()) {
                matches.push(new SlotMatch(true, value, slotValue));
            } else if (slotValue.name.synonyms) {
                for (const synonym of slotValue.name.synonyms) {
                    if (synonym.toLowerCase() === value.toLowerCase()) {
                        matches.push(new SlotMatch(true, value, slotValue, synonym));
                    }
                }
            }
        }
        return matches;
    }
}

export interface ISlotType {
    name: string;
    values?: ISlotValue[];
}

export interface ISlotValue {
    id?: string;
    builtin?: boolean;
    name: ISlotValueName;
}

export interface ISlotValueName {
    value: string;
    synonyms: string[];
}
