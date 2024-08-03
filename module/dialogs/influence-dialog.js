export class InfluenceDialog extends Dialog {
    constructor(messageId, options) {
        super(options);

        this.message = game.messages.get(messageId);
        let scenarioId = game.scenes.active.getFlag("juink", "scenario");
        this.scenario = game.actors.get(scenarioId);

        this.actionDice = this.message.rolls[0].terms[0].results.map( e => e.result );
        this.fateDice = [];

        for (let dice of Object.values(this.scenario.system.dice))
            this.fateDice.push(dice);

        this.total = this._getTotal();

        this.action = null;
        this.fate = null;

        this.data = {
            title: game.i18n.localize("Juink.Influence"),
            content: this.getContent(),
            buttons: {
                "cancel": {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel",
                    callback: () => console.log("Canceled")
                },
                "apply": {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Apply",
                    callback: () => this._submit()
                }
            },
            default: "apply"
        };

    }

      /** @override */
	static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "templates/hud/dialog.html",
            classes: ["juink", "dialog"],
            width: 400
        });
    }

      /** @override */
	activateListeners(html) {
        super.activateListeners(html);

        html.find(".action, .fate").click(this._selectDice.bind(this));
        html.find(".dice-change").click(this._swapDice.bind(this));
    }

    getContent() {
        let content = `
            <h2> ${ game.i18n.localize("Juink.InfluenceDialog") } </h2>
            <form>
                <div class="form-group">
                    <label>
                        ${  game.i18n.localize("Juink.RollDice") } - 
                        <span id="actionTotal">${this.total}</span>
                    </label>
                <div>
        `;
        $(this.actionDice).each(element => {
            content += `
                    <img class="action" width=45 height=45 data-index=${element} data-value=${this.actionDice[element]} src="systems/juink/assets/dices/${this.actionDice[element]}.PNG">
            `;
        });
        content += `
                </div>
            </div>
            <div class="form-group">
                <label>${ game.i18n.localize("Juink.FateDices") }</label>
                <div>`;

        $(this.fateDice).each(element => {
            content += `
                    <img class="fate" width=45 height=45 data-key=${element} data-value=${this.fateDice[element]} src="systems/juink/assets/dices/${this.fateDice[element]}.PNG">
            `;
        });
        content += `
                </div>
            </div>
            <button type="button" class="dice-change">Change</button><br>
        `;

        return content;
    }

    _getTotal() {
        let total = this.message.rolls[0].total - this.message.rolls[0].terms[0].total;
        $(this.actionDice).each(element => {
           total += Number(this.actionDice[element]); 
        });
        return total;
    }

    _selectDice(event) {
        event.preventDefault();

        if ($(event.currentTarget).hasClass("dice-select")) {
            $(event.currentTarget).removeClass("dice-select");

            if ($(event.currentTarget).hasClass("action"))
                this.action = null;
            else
                this.fate = null;
            
            return;
        }

        $(event.currentTarget).parent().find(".dice-select").removeClass("dice-select");
        $(event.currentTarget).addClass("dice-select");
        if ($(event.currentTarget).hasClass("action"))
            this.action = event.currentTarget;
        else
            this.fate = event.currentTarget;

    }

    _swapDice(event) {
        if (this.action != null && this.fate != null) {
            let tmp = this.action.dataset.value;
            this.action.dataset.value = this.fate.dataset.value;
            this.fate.dataset.value = tmp;

            $(this.action).attr("src", `systems/juink/assets/dices/${this.action.dataset.value}.PNG`);
            $(this.fate).attr("src", `systems/juink/assets/dices/${this.fate.dataset.value}.PNG`);

            this.actionDice[this.action.dataset.index] =  Number(this.action.dataset.value);
            this.fateDice[this.fate.dataset.key] = Number(this.fate.dataset.value);

            $(event.currentTarget).parent().find(".dice-select").removeClass("dice-select");
            $("#actionTotal").text(this._getTotal());

            this.action = null;
            this.fate = null;
        }
    }

    async _submit() {
        let updates = {};
        for (let i = 0; i < this.fateDice.length; ++i)
            updates[i] = this.fateDice[i];
        this.scenario.update({"system.dice": updates});

        let roll = this.message.rolls[0].clone();
        roll.terms[0].number = 0;

        $(this.actionDice).each(element => {
            roll.terms[0].results.push({result: this.actionDice[element], active: true});
        });
        await roll.roll();

        this.message.flags.juink.title = `${this.message.flags.juink.title} [${game.i18n.localize("Juink.Influence")}]`;
        this.message.flags.juink.canInfluence = false;
        let actor = game.actors.get(this.message.speaker.actor);
        actor.toMessage({
            title: this.message.flags.juink.title,
            showList: true,
            eventList: this.message.flags.juink.activeEffect.event,
            itemList: this.message.flags.juink.activeEffect.item,
            abilityList: this.message.flags.juink.activeEffect.ability,
            canInfluence: this.message.flags.juink.canInfluence,
            roll: roll
        }, {
            flags: this.message.flags, 
            rolls: [roll],
        });

    }


}
