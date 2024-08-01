/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { JuinkEffectDialog } from "../dialogs/effect-dialog.js";

export class JuinkActorSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        classes: ["juink", "sheet", "actor"],
        width: 400,
        height: 800,
        tabs: [
            {navSelector: ".tabs", contentSelector: ".default-screen", initial: "initial"},
            {navSelector: ".diary-tabs", contentSelector: ".diary-screen", initial: "ability"},
        ],
        dragDrop: [{dragSelector: ".changable-screen .item", dropSelector: null}],
        resizable: false
      });
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    get template() {
        const path = "systems/juink/templates/sheets/actor";
        return `${path}/${this.actor.type}-sheet.html`;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    async getData(options) {
        let isOwner = false;
        let isEditable = this.isEditable;
        let data = super.getData(options);
        let items = {};
        let actorData = {};

        isOwner = this.document.isOwner;
        isEditable = this.isEditable;

        data.lang = game.i18n.lang;
        data.userId = game.user.id
        data.isGM = game.user.isGM;

        // The Actor's data
        actorData = this.actor.toObject(false);
        data.actor = actorData;
        data.system = this.actor.system;
        data.system.isOwner = isOwner;

        data.items = Array.from(this.actor.items.values());
        data.items = data.items.map( i => {
            i.system.id = i.id;
            return i;
        });

        data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

        actorData.itemList = [];
        actorData.abilityList = [];

        for (let i of data.items) {
            if (i.type == 'item')
                actorData.itemList.push(i);
            else if (i.type == 'ability')
                actorData.abilityList.push(i);
        }

        data.enrichedBiography = await TextEditor.enrichHTML(data.system.details.biography, {async: true});
        data.enrichedDiary = await TextEditor.enrichHTML(data.system.details.diary, {async: true});

        return data;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    async activateListeners(html) {
        super.activateListeners(html);

        this.drag = false;
        this.moved = false;
        this.dragPoint = 0;
        this.MaxdragPoint = 25;
       
        let timeoutId = 0;
        let onDragCheck = e => {
            document.body.style.cursor = 'pointer';
            this.drag = true;
            this.moved = false;
            this.clientY = e.clientY;
            this.dragPoint = (this.document.system.attributes.dice.open) ? this.MaxdragPoint : 0;
        }

        html.find(".phone-content").on("mouseup mouseleave", async e => {
            document.body.style.cursor = 'auto';
            clearTimeout(timeoutId);

            this.drag = false;
            if (!this.moved)
                return;
            
            if (this.dragPoint < (this.MaxdragPoint - 5)) {
                this.dragPoint = 0;
                html.find(".default-screen").css("height", "95%");
                html.find(".roll-screen").css("display", "none");
                await this.document.update({"system.attributes.dice.open": false});
            } else
                await this.document.update({"system.attributes.dice.open": true});
        });
        html.find(".phone-content").mousedown(e => {
            timeoutId = setTimeout(() => onDragCheck(e), 400);
        });
        html.find(".phone-content").mousemove(this._onChangeVisibilityRollSection.bind(this, html));

        html.find(".dice").click(e => {
            if (e.currentTarget.classList.contains("unchecked")) {
                e.currentTarget.classList.remove('unchecked');
                e.currentTarget.classList.add('checked');
            } else {
                e.currentTarget.classList.add('unchecked');
                e.currentTarget.classList.remove('checked');
            }
        });


        html.find(".move-tab").click(e => {
            let name = $(e.currentTarget)[0].dataset.tab;
            this._tabs[0].activate(name, {triggerCallback: true});
        });

        html.find(".item-usage-check").on('mousedown', async event => {
            if (event.button == 2 || event.which == 3)
                await this.document.update({"system.itemUsage": !this.document.system.itemUsage});
        });


        html.find(".add-hope").click(async e => {
            let add = $(e.currentTarget)[0].dataset.add;
            let val = this.document.system.hope.value + Number(add);
            if (val < 0)
                val = 0;
            this.document.update({"system.hope.value": val});
        });

        html.find(".add-life").click(async e => {
            let add = $(e.currentTarget)[0].dataset.add;
            let val = this.document.system.life.value + Number(add);
            if (val > this.document.system.life.max)
                val = this.document.system.max;
            this.document.update({"system.life.value": val});
        });

        html.find(".update-pool").change(async () => {
            let attr = html.find(".update-pool").val();
            let val = 0;
            if (attr != "-")
                val = this.document.system.attributes[attr].value; 
            await this.document.update({"system.attributes.dice.pool": val});
        })


        html.find(".use-item").click(async event => {
            const li = event.currentTarget.closest(".item");
            const item = this.actor.items.get(li.dataset.itemId);
            
            if (item.type == "item" && this.document.system.itemUsage || item.type == "ability" && item.system.used.state) {
                new Dialog({
                    title: item.name,
                    content: "<p>"+ game.i18n.localize("Juink.Error.AlreadyUseItem") + "</p>",
                    buttons: {
                        confirm: {
                            icon: '<i class="fas fa-check"></i>',
                            label: "Confirm",
                            callback: async () => { }
                        }
                    },
                    default: "confirm"
                }).render(true);
                return;
            }

            new Dialog({
                title: item.name,
                content: "<p>"+ item.name + game.i18n.localize("Juink.UseQuestion") + "</p>",
                buttons: {
                    confirm: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Confirm",
                        callback: async () => {
                            await item.use(this.document, null);
                        }
                    }
                },
                default: "confirm"
            }).render(true);

        });

        html.find(".show-item").click(async event => {
            const li = event.currentTarget.closest(".item");
            const item = this.actor.items.get(li.dataset.itemId);
            item.sheet.render(true);
        });

        html.find(".add-item").click(async event => {
            const li = event.currentTarget.closest(".item");
            const item = this.actor.items.get(li.dataset.itemId);
            let add = $(event.currentTarget)[0].dataset.add;

            let val = item.system.quantity.value + Number(add);
            if (val < 0)
                return;
            item.update({"system.quantity.value": val});
        });

        html.find(".add-address").click(async () => {
            let id = randomID(12);
            await this.document.update({[`system.address.list.${id}`]: {
                "img": "icons/svg/mystery-man.svg"
            }});
        });

        html.find(".delete-address").click(async event => {
            const id = $(event.currentTarget)[0].dataset.id;
            await this.document.update({[`system.address.list.-=${id}`]: null});
        });

        html.find(".ability-link").click(async event => {
            const li = event.currentTarget.closest(".item");
            const item = this.actor.items.get(li.dataset.itemId);
            await item.update({"system.link": !item.system.link});
        });


        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        html.find(".show-job").click(async () => await this.document.system.job.sheet.render(true));
        html.find(".delete-job").click(async () => await this.document.system.job.delete());

        html.find(".roll-calculate").click(async () => {
            let baseDice = $(".dice-pool .dice.checked").length;
            let callback = async (dice, add, activeEffect) => {
                let formula = `${dice}D6 + ${add}`;
                let r = new Roll(formula);
                await r.roll({async: true});
                this.actor.toMessage({
                    title: game.i18n.localize("Juink.Calculate"),
                    showList: true,
                    eventList: activeEffect.event,
                    itemList: activeEffect.item,
                    abilityList: activeEffect.ability,
                    canInfluence: true,
                    roll: r
                }, {
                    flags: {
                        juink: {
                            title: game.i18n.localize("Juink.Calculate"),
                            usage: "calculate",
                            actor: this,
                            activeEffect: activeEffect,
                            canInfluence: true
                        }
                    },
                    rolls: [r] 
                });
            }

            new JuinkEffectDialog(this.document, "calculate", baseDice, callback).render(true);
        });

        html.find(".roll-decrease").click(async () => {
            let baseDice = $(".dice-pool .dice.checked").length;
            let callback = async (dice, add, activeEffect) => {
                let formula = `${dice}D6 + ${add}`;
                let r = new Roll(formula);
                await r.roll({async: true});
                this.actor.toMessage({
                    title: game.i18n.localize("Juink.Decrease"),
                    showList: true,
                    eventList: activeEffect.event,
                    itemList: activeEffect.item,
                    abilityList: activeEffect.ability,
                    canInfluence: true,
                    roll: r
                }, {
                    flags: {
                        juink: {
                            title: game.i18n.localize("Juink.Decrease"),
                            usage: "decrease",
                            actor: this,
                            activeEffect: activeEffect,
                            canInfluence: true
                        }
                    },
                    rolls: [r] 
                });
            }

            new JuinkEffectDialog(this.document, "decrease", baseDice, callback).render(true);
        });

        html.find(".add-dice").click(async () => {
            let baseDice = $(".dice-pool .dice.checked").length;
            let callback = async (dice, add, activeEffect) => {
                let d = (this.document.system.attributes.dice.pool + Number(dice) < 0) ? 0 : this.document.system.attributes.dice.pool + Number(dice);
                await this.document.update({"system.attributes.dice.pool": d});
            }

            new JuinkEffectDialog(this.document, "dice", baseDice, callback).render(true);
        });

        html.find(".hope-title").click(async () => {
            new Dialog({
                title: game.i18n.localize("Juink.Hope"),
                content: `
                    <div class="input-bar" style="margin-bottom: 3px;">
                        ${game.i18n.localize("Juink.UseHope")}
                        <div class="flex">
                            <a onclick="changeHope(-1)">-</a>
                            <input type="number" class="hope-usage-for-life" placeholder="0">  
                            <a onclick="changeHope(1)">+</a>
                        </div>
                    </div>
                    <script>
                        let max = ${this.actor.system.hope.value};
                        function changeHope(add) {
                            let hopeInput = $("input.hope-usage-for-life")
                            if (Number(hopeInput.val()) + add > max || Number(hopeInput.val()) + add < 0)
                                return;
                            hopeInput.val(Number(hopeInput.val()) + add);
                        }
                    </script>
                `,
                buttons: {
                    confirm: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Confirm",
                        callback: async () => {
                            let hope = Number($("input.hope-usage-for-life").val());
                            if (hope < 1)
                                return;

                            let roll = new Roll(`${hope}d6`);
                            await roll.roll();
                            roll.toMessage({flavor: game.i18n.localize("Juink.Hope")});

                            let updates = {
                                "system.hope.value": this.actor.system.hope.value - hope,
                                "system.life.value": (this.actor.system.life.value + roll.total > this.actor.system.life.max) ? this.actor.system.life.max : this.actor.system.life.value + roll.total
                            }
                            await this.actor.update(updates);

                        }
                    }
                },
                default: "confirm"
            }, {classes: ["juink", "dialog"]}).render(true);
        });
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    setPosition(options={}) {
        const position = super.setPosition(options);
        return position;
    }
  
    /* -------------------------------------------- */

    _onChangeVisibilityRollSection(html, event) {
        if (!this.drag)
            return;
        this.moved = true;

        this.dragPoint += (this.clientY - event.clientY) / 2;
        if (this.dragPoint > this.MaxdragPoint)
            this.dragPoint = this.MaxdragPoint;
        if (this.dragPoint < 0)
            this.dragPoint = 0;

        html.find(".roll-screen").css("height", this.dragPoint + "%");
        html.find(".default-screen").css("height", (95 - this.dragPoint) + "%");

        this.clientY = event.clientY;
    }

    /* -------------------------------------------- */

    /** @override */
    async _onDropItem(event, data) {
        if ( !this.actor.isOwner ) return false;
        const item = await Item.implementation.fromDropData(data);
        
        if (item.type == "event" || item.type == 'identify') {
            ui.notifications.info(game.i18n.localize("Juink.Error.NotSupportItem"));
            return;
        }

        if (this.document.system.job != undefined && item.type == "job") {
            ui.notifications.info(game.i18n.localize("Juink.Error.AlreadyJob"));
            return;
        }

        if (item.type == "job") {
            let items = [];
            for (const [key, value] of Object.entries(item.system.items)) {
                if (value.value == 0)
                    continue;
                let subItem = await fromUuid(value.uuid);
                let subItemData = duplicate(subItem);
                subItemData.system.quantity.value = subItemData.system.quantity.max = Number(value.value);
                items.push(subItemData);
            }

            await this.actor.createEmbeddedDocuments("Item", items, {});
        }


        return super._onDropItem(event, data);
    }
    
    /* -------------------------------------------- */



}