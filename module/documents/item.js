export class JuinkItem extends Item {

    prepareData() {
        super.prepareData();

        if (this.type != "event")
            return;
        
        this.system.life.max = this.system.life.origin;
        if (this.actor != null && this.actor.type == "scenario" && this.system.life.add)
            this.system.life.max += this.actor.system.juin * this.actor.system.player;
    }

    async use(actor, chatMessage) {
        let ret = await this.payCost(actor);
        if (!ret) {
            ui.notifications.info(game.i18n.localize("Juink.Error.NotUseItem"));
            return false;
        }

        let chatData = {
            user: game.user._id,
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: this.name + game.i18n.localize("Juink.UseConfirm")
        };

        ChatMessage.create(chatData);

        let inputDialog =  (callback, placeholder) => {
            new Dialog({
                title: this.name,
                content: ` 
                    <div class="form-group">  
                        <input id="textval" style="width: 100%;" placeholder="${placeholder}"></input>
                    </div>
                    <hr>
                `,
                buttons: {
                    confirm: {
                        label: `Confirm`,
                        callback: async (dialog_html) => {
                            let new_val = $(dialog_html).find("#textval")[0].value;
                            await callback(new_val);
                        }
                    }
                },
                close: () => {},
                default: "confirm"
            },
            {
                classes: ["juink"]
            }).render(true);
        }
        
        let type = this.system.effect.type;
        if (type == "addDice") {
            if (chatMessage == null)
                return;

            let action = async (input) => {
                let roll = await game.Juink.addDice(chatMessage, Number(input), 0);
                chatMessage.flags.juink.activeEffect[this.type][this.id] = this;
    
                await game.Juink.relayMessage(roll, chatMessage);
            }
            if (this.system.effect.value == "dialog")
                inputDialog(action, game.i18n.localize("Juink.inputNumberGuide"));
            else
                action(this.system.effect.value);

        } else if (type == "addValue") {
            if (chatMessage == null)
                return;

            let action = async (input) => {
                let roll = await game.Juink.addDice(chatMessage, 0, Number(input));
                chatMessage.flags.juink.activeEffect[this.type][this.id] = this;
    
                await game.Juink.relayMessage(roll, chatMessage);
            }
            if (this.system.effect.value == "dialog")
                inputDialog(action, game.i18n.localize("Juink.inputNumberGuide"));
            else
                action(this.system.effect.value);

        } else if (type == "changeDice") {
            if (chatMessage == null)
                return;

            let action = async (input) => {
                let value = input.trim();
                let before = Number(value.split(" ")[0].split("[")[1]);
                let after = Number(value.split(" ")[1].split("]")[0]);
                let roll = await game.Juink.changeDice(chatMessage, before, after);
                chatMessage.flags.juink.activeEffect[this.type][this.id] = this;
    
                await game.Juink.relayMessage(roll, chatMessage);
            }
            if (this.system.effect.value == "dialog")
                inputDialog(action, game.i18n.localize("Juink.ChangeDiceGuide"));
            else
                action(this.system.effect.value);

        } else if (type == "reRollDice") {
            if (chatMessage == null)
                return;

            let action = async (input) => {
                let value = input.trim();
                let nums = value.split(" ").map(e => Number(e));
                let roll = await game.Juink.reRollDice(chatMessage, nums);
                chatMessage.flags.juink.activeEffect[this.type][this.id] = this;
    
                await game.Juink.relayMessage(roll, chatMessage);
            }
            if (this.system.effect.value == "dialog")
                inputDialog(action, game.i18n.localize("Juink.inputMultiNumberGuide"));
            else
                action(this.system.effect.value);

        } else if (type == "addLife" || type == "addHope") {

            let updates = {};
            if (type == "addHope") {
                updates["system.hope.value"] = actor.system.hope.value + Number(this.system.effect.value);
            } else if (type == "addLife") {
                let r = new Roll(this.system.effect.value);
                await r.roll();
                r.toMessage();
                updates["system.life.value"] = (actor.system.life.value + r.total) > actor.system.life.max ? actor.system.life.max : actor.system.life.value + r.total;
            }
            await actor.update(updates);

        } else if (type == "runMacro") {
            let macro = game.macros.find(e => e.name == this.system.effect.macro);

            let scope = {};
            scope.item = this;
            scope.actor = actor;
            scope.message = chatMessage;
            scope.value = this.system.effect.value;

            await macro.execute(scope);
        }
        
        return true;
    }

    async payCost(actor) {
        if (this.type == "ability")
            return await this._payCostForAbility();
        else if (this.type == "item")
            return await this._payCostForItem();
        else if (this.type == "event")
            return await this._payCostForEvent(actor);
    }

    async _payCostForAbility() {
        let type = (this.system.link) ? this.system.cost.linked.type : this.system.cost.normal.type;
        let value = (this.system.link) ? this.system.cost.linked.value : this.system.cost.normal.value;

        if (this.actor == null)
            return false;

        let updates = {};
        if (type == "hope") {
            updates["system.hope.value"] = this.actor.system.hope.value - value;
        } else if (type == "life") {
            let r = new Roll(value);
            await r.roll();
            r.toMessage();
            updates["system.life.value"] = this.actor.system.life.value - r.total;
        }

        if (updates["system.hope.value"] < 0)
            return false;

        if (this.system.used.limit != '-')
            await this.update({"system.used.state": true});
        await this.actor.update(updates);
        return true;
    }

    async _payCostForItem() {
        if (this.system.quantity.value < 1 || this.actor.system.itemUsage)
            return false;
        await this.update({"system.quantity.value": this.system.quantity.value - 1});

        if (this.actor == null)
            return false;
        await this.actor.update({"system.itemUsage": true});
        return true;
    }

    async _payCostForEvent(actor) {
        await actor.update({[`system.event.${this.id}`]: this});
        return true;
    }


}