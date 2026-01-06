/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */

import { JuinkEffectDialog } from "../dialogs/effect-dialog.js";

export class JuinkActorSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
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

        data.diceSelect = {
            "-": "-",
            "str": game.i18n.localize("Juink.Str"),
            "agi": game.i18n.localize("Juink.Agi"),
            "int": game.i18n.localize("Juink.Int"),
            "wil": game.i18n.localize("Juink.Wil"),
            "lck": game.i18n.localize("Juink.Lck")
        }

        data.diceOpen = game.user.getFlag('world', `juink.sheet.${this.actor.id}.diceOpen`) ?? false;

        return data;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    async activateListeners(html) {
        super.activateListeners(html);

        html.find(".move-tab").click(e => {
            let name = $(e.currentTarget)[0].dataset.tab;
            this._tabs[0].activate(name, {triggerCallback: true});
        });

        html.find(".show-job").click(async () => await this.document.system.job.sheet.render(true));
        
        html.find(".show-item").click(async event => {
            const li = event.currentTarget.closest(".item");
            const item = this.actor.items.get(li.dataset.itemId);
            item.sheet.render(true);
        });

        this.drag = false;
        this.dragPoint = 0;
        this.MaxdragPoint = 24;

        // 드래그 시작
        html.find(".phone-content").on("mousedown", e => {
            // 버튼이나 입력 필드를 클릭한 경우 드래그 무시
            if ($(e.target).is('button, input, a, img, select, textarea')) {
                return;
            }
            
            this.drag = true;
            this.clientY = e.clientY;
            this.dragPoint = game.user.getFlag('world', `juink.sheet.${this.actor.id}.diceOpen`) ? this.MaxdragPoint : 0;
            document.body.style.cursor = 'grabbing';
            e.preventDefault(); // 텍스트 선택 방지
        });

        // 드래그 중
        html.find(".phone-content").on("mousemove", e => {
            if (!this.drag) return;

            // 드래그 거리 계산 (민감도 조절)
            this.dragPoint += (this.clientY - e.clientY) / 3;
            
            // 범위 제한
            if (this.dragPoint > this.MaxdragPoint)
                this.dragPoint = this.MaxdragPoint;
            if (this.dragPoint < 0)
                this.dragPoint = 0;

            // UI 업데이트
            html.find(".roll-screen").css({
                "height": this.dragPoint + "%",
                "display": "block"
            });
            html.find(".default-screen").css("height", (100 - this.dragPoint) + "%");

            this.clientY = e.clientY;
        });

        // 드래그 종료
        html.find(".phone-content").on("mouseup mouseleave", async e => {
            if (!this.drag) return;
            
            this.drag = false;
            document.body.style.cursor = 'auto';
            
            // 절반 이상 열렸으면 완전히 열기, 아니면 닫기
            const threshold = this.MaxdragPoint / 2;
            
            if (this.dragPoint > threshold) {
                this.dragPoint = this.MaxdragPoint;
                html.find(".roll-screen").css("height", this.MaxdragPoint + "%");
                html.find(".default-screen").css("height", (100 - this.MaxdragPoint) + "%");
                html.find(".drag-area-indicator").addClass("dice-opened");
                await game.user.setFlag('world', `juink.sheet.${this.actor.id}.diceOpen`, true);
            } else {
                this.dragPoint = 0;
                html.find(".roll-screen").css({
                    "height": "0",
                    "display": "none"
                });
                html.find(".default-screen").css("height", "100%");
                html.find(".drag-area-indicator").removeClass("dice-opened");
                await game.user.setFlag('world', `juink.sheet.${this.actor.id}.diceOpen`, false);
            }
        });

        html.find(".drag-area-indicator").click( async e => {
            const currentState = game.user.getFlag('world', `juink.sheet.${this.actor.id}.diceOpen`) ?? false;
            const newState = !currentState;
            
            if (newState) {
                // 열기
                this.dragPoint = this.MaxdragPoint;
                await game.user.setFlag('world', `juink.sheet.${this.actor.id}.diceOpen`, true);
                html.find(".roll-screen").css({
                    "height": this.MaxdragPoint + "%",
                    "display": "block"
                });
                html.find(".default-screen").css("height", (100 - this.MaxdragPoint) + "%");
                html.find(".drag-area-indicator").addClass("dice-opened");
            } else {
                // 닫기
                this.dragPoint = 0;
                await game.user.setFlag('world', `juink.sheet.${this.actor.id}.diceOpen`, false);
                html.find(".roll-screen").css({
                    "height": "0",
                    "display": "none"
                });
                html.find(".default-screen").css("height", "100%");
                html.find(".drag-area-indicator").removeClass("dice-opened");
            }

        });

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        html.find(".dice").click(e => {
            if (e.currentTarget.classList.contains("unchecked")) {
                e.currentTarget.classList.remove('unchecked');
                e.currentTarget.classList.add('checked');
            } else {
                e.currentTarget.classList.add('unchecked');
                e.currentTarget.classList.remove('checked');
            }
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
                "img": "icons/svg/mystery-man.svg",
                "name": "",
                "feel": ""
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

        html.find(".delete-job").click(async () => await this.document.system.job.delete());

        html.find(".roll-calculate").click(async () => {
            let baseDice = $(".dice-pool .dice.checked").length;
            let callback = async (dice, add, activeEffect) => {
                let formula = `${dice}D6 + ${add}`;
                let r = new Roll(formula);
                await r.roll();
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
                await r.roll();
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
                let subItemData = foundry.utils.duplicate(subItem);
                subItemData.system.quantity.value = subItemData.system.quantity.max = Number(value.value);
                items.push(subItemData);
            }

            await this.actor.createEmbeddedDocuments("Item", items, {});
        }


        return super._onDropItem(event, data);
    }
    
    /* -------------------------------------------- */



}