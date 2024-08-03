
export class JuinkEffectDialog extends Dialog {

    // usage = "use" / "calculate" / "decrease" / "dice"
    constructor(actor, usage, baseDice, callback, message, options) {
        super(options);

        this.actor = actor;
        this.usage = usage;
        this.baseDice = baseDice;
        let buttons = {};
        
        this.activeEffect = {
            "item": {},
            "event": {},
            "ability": {}
        }

        this.dialogInputs = {}

        let scenarioId = game.scenes.active.getFlag("juink", "scenario");
        let scenario = game.actors.get(scenarioId);

        this.eventList = [];
        this.itemList = [];
        this.abilityList = [];

        if (usage == "use") {
            this.type == "useEffect";
            this.message = message;
            this.isHope = (this.message.flags.juink.usage == "calculate");

            this.eventList = scenario.items.filter(e => 
                e.type == "event" &&
                e.system.life.value >= e.system.life.max &&
                !(e.id in this.actor.system.event)
            );
    
            if (!this.actor.system.itemUsage)
                this.itemList = actor.items.filter(e => e.type == "item");
    
            this.abilityList = actor.items.filter(e => 
                e.type == "ability" &&
                e.system.used.state == false
            );
        }

        if (usage == "calculate" || usage == "decrease" || usage == "dice") {
            this.type == "addDice";
            this.isHope = (usage == "calculate");

            this.eventList = scenario.items.filter(e => 
                e.type == "event" &&
                e.system.life.value >= e.system.life.max &&
                !(e.id in this.actor.system.event) && 
                ["-", "dice", usage].includes(e.system.effect.timing) &&
                ["-", "addDice"].includes(e.system.effect.type)
            );
    
            if (!this.actor.system.itemUsage) {
                this.itemList = actor.items.filter(e => 
                    e.type == "item" &&
                    e.system.quantity.value > 0 &&
                    ["-", "dice", usage].includes(e.system.effect.timing) &&
                    ["-", "addDice"].includes(e.system.effect.type)
                );
            }
    
            this.abilityList = actor.items.filter(e => 
                e.type == "ability" &&
                e.system.used.state == false &&
                ["-", "dice", usage].includes(e.system.effect.timing) &&
                ["-", "addDice"].includes(e.system.effect.type)
            );

            buttons = {
                "cancel": {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => console.log("Canceled")
                },
                "select": {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Select",
                    callback: async () => {
                        this._updateActived();
                        this._payCost();

                        await this.actor.update({"system.attributes.dice.pool": this.actor.system.attributes.dice.pool - this.baseDice});
                        if (this.usage == "calculate")
                            await this.actor.update({"system.hope.value": this.actor.system.hope.value - Number($(".hope-usage").val())});

                        let dice = this.baseDice + Number(this.actived) + Number($("input.add-dice").val());
                        let addValue = Number($(".add-value").val());
                        callback(dice, addValue, this.activeEffect);
                    }
                }
            }
        }

        this.data = {
            title: game.i18n.localize("Juink.AddDice"),
            content: "",
            buttons: buttons,
            default: "select"
        };

    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "systems/juink/templates/dialogs/effect-dialog.html",
            classes: ["juink", "dialog"],
            width: 400
        });
    }
    /** @override */
    getData() {
        let data = super.getData();

        data.eventList = this.eventList;
        data.itemList = this.itemList;
        data.abilityList = this.abilityList;

        data.usage = this.usage;
        data.isUse = this.usage == "use";
        data.isHope = this.isHope;

        data.baseDice = this.baseDice;

        return data;
    }

    /** @override */
	activateListeners(html) {
        super.activateListeners(html);

        html.find(".show-item").click(async event => {
            const li = event.currentTarget.closest(".item");
            const itemList = li.dataset.itemList;
            this[itemList].find(e => e.id == li.dataset.itemId).sheet.render(true);
        });
        
        html.find('.item-label').click(this._showItemDetails.bind(this));

        html.find(".add-hope").click(async e => {
            let hopeMax = this.actor.system.hope.value;
            let hope = Number($(".hope-usage").val());
            let add = $(e.currentTarget)[0].dataset.add;
            let val = hope + Number(add);
            
            if (val < 0)
                val = 0;
            if (val > hopeMax)
                val = hopeMax;

            $(".hope-usage").val(val);
            this._updateActived();
        });

        html.find(".dialog-input").change(async event => {
            const li = event.currentTarget.closest(".item");
            const itemList = li.dataset.itemList;
            const item = this[itemList].find(e => e.id == li.dataset.itemId);

            this.dialogInputs[item.id] = $(event.currentTarget).val();

            this._updateActived();
        });

        html.find(".use-check").click(async event => {
            const li = event.currentTarget.closest(".item");
            const itemList = li.dataset.itemList;
            const item = this[itemList].find(e => e.id == li.dataset.itemId);

            if (item.id in this.activeEffect[item.type])
                delete this.activeEffect[item.type][item.id];
            else
                this.activeEffect[item.type][item.id] = item;

            this._updateActived();
        });

        html.find(".add-input").click(() => {
            $(".reroll-inputs").prepend(`
                <input type="number" class="reroll-value" placeholder="0">
                <span></span>
            `);
        });

        html.find(".use-item").click(async event => {
            const li = event.currentTarget.closest(".item");
            const itemList = li.dataset.itemList;
            let ret = await this[itemList].find(e => e.id == li.dataset.itemId).use(this.actor, this.message);
            if (ret)
                this.close();
        });

        html.find(".use-hope-action").click(async event => {
            let hope = Number($("input.hope-usage").val());
            let lastHope = this.actor.system.hope.value - hope;
            if (hope == 0 || lastHope < 0) {
                this.close();
                return;
            }

            await this.actor.update({"system.hope.value": lastHope});
            let roll = await game.Juink.addDice(this.message, hope, 0);
            await game.Juink.relayMessage(roll, this.message);
            this.close();
        });

        html.find(".add-dice-action").click(async event => {
            let dice = Number($("input.add-dice").val());
            let value = Number($("input.add-value").val());
            if (dice == 0 && value == 0) {
                this.close();
                return;
            }

            let roll = await game.Juink.addDice(this.message, dice, value);
            await game.Juink.relayMessage(roll, this.message);
            this.close();
        });

        html.find(".change-dice-action").click(async event => {
            let before = Number($("input.from-value").val());
            let after = Number($("input.to-value").val());
            if (before == 0 || after == 0) {
                this.close();
                return;
            }

            let roll = await game.Juink.changeDice(this.message, before, after);
            await game.Juink.relayMessage(roll, this.message);
            this.close();
        });

        html.find(".re-roll-action").click(async event => {
            let nums = [];
            for (let e of $("input.reroll-value")) {
                let num = Number($(e).val());
                if (num != 0)
                    nums.push(num);
            }
            if (nums.length == 0) {
                this.close();
                return;
            }

            let roll = await game.Juink.reRollDice(this.message, nums);
            await game.Juink.relayMessage(roll, this.message);
            this.close();
        });
        
    }

    _showItemDetails(event) {
        event.preventDefault();
        const toggler = $(event.currentTarget);
        const item = toggler.parents('.item');
        const description = item.find('.item-description');
    
        toggler.toggleClass('open');
        description.slideToggle();
    }

    _updateActived() {
        this.actived = 0;

        let type = ["event", "item", "ability"];
        for (let t of type) {
            for (let item of Object.values(this.activeEffect[t])) {
                if (item.system.effect.type == "addDice")
                    this.actived += (item.system.effect.value == "dialog") ? Number(this.dialogInputs[item.id]) : Number(item.system.effect.value)
            }
        }

        if (this.usage == "calculate")
            this.actived += Number($(".hope-usage").val());

        $(".actived").val(this.actived);
    }

    async _useEffect() {

    }

    async _payCost() {
        for (let item of Object.values(this.activeEffect.event))
            await item.payCost(this.actor);

        for (let item of Object.values(this.activeEffect.item))
            await item.payCost(this.actor);

        for (let item of Object.values(this.activeEffect.ability))
            await item.payCost(this.actor);
    }

}