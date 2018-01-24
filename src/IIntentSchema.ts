export interface IIntentSchema {
    intents: () => Intent[];
    intent: (intentString: string) => Intent;
    hasIntent: (intentString: string) => boolean;
}

export class Intent {
    public builtin: boolean = false;
    public slots: IntentSlot[] = null;
    public constructor(public name: string, builtin?: boolean) {
        this.builtin = builtin;
    }

    public addSlot(slot: IntentSlot): void {
        if (this.slots === null) {
            this.slots = [];
        }

        this.slots.push(slot);
    }

    public slotForName(name: string): IntentSlot {
        for (const slot of this.slots) {
            if (name.toLowerCase() === slot.name.toLowerCase()) {
                return slot;
            }
        }
        return undefined;
    }
}

export class IntentSlot {
    public constructor(public name: string, public type: string) {}
}
