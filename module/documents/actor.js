
import { JuinkEffectDialog } from "../dialogs/effect-dialog.js";

export class JuinkActor extends Actor {

    /** @override */
    async _preCreate(data, options, user) {
        await super._preCreate(data, options, user);
        this.prototypeToken.updateSource({ actorLink: true });
    }

    /** @override */
    async _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);

        if (this.type != "character")
            return;

        if (this.items.find(e => e.name == game.i18n.localize("Juink.DefaultAbilityName")) != undefined)
            return;

        let itemData = {
            name: game.i18n.localize("Juink.DefaultAbilityName"),
            type: "ability",
            img: `icons/sundries/documents/document-letter-blue.webp`,
            system: {
                "link": true,
                "timing": game.i18n.localize("Juink.DefaultAbilityTiming"),
                "cost": {
                    "normal": {
                        "type": "-",
                        "value": ""
                    },
                    "linked": {
                        "type": "-",
                        "value": ""
                    }
                },
                "target": game.i18n.localize("Juink.DefaultAbilityTarget"),
                "used": {
                    "limit": "scenario",
                    "state": false
                },
                "description": game.i18n.localize("Juink.DefaultAbilityDesc"),
                "effect": {
                    "timing": "dice",
                    "type": "addDice",
                    "value": "4",
                }
            }
        };
        await this.createEmbeddedDocuments("Item", [itemData], {});
    }

    prepareData() {
        super.prepareData();

        if (this.type != "character")
            return;

        this._prepareAttributes();
    }

    
    _prepareAttributes() {
        let job = this.system.job = this.items.find(e => e.type == "job");
        if (job == undefined)
            return;

        this.system.attributes.str.value = Number(job.system.attributes.str.value) + this.system.attributes.str.add;
        this.system.attributes.agi.value = Number(job.system.attributes.agi.value) + this.system.attributes.agi.add;
        this.system.attributes.int.value = Number(job.system.attributes.int.value) + this.system.attributes.int.add;
        this.system.attributes.wil.value = Number(job.system.attributes.wil.value) + this.system.attributes.wil.add;
        this.system.attributes.lck.value = Number(job.system.attributes.lck.value) + this.system.attributes.lck.add;

        this.system.life.max = Number(job.system.life) + this.system.life.add;
        this.system.hope.init = Number(job.system.hope);
    }

    async useDice(pos) {
        let oriValue = this.system.dice[pos];

        new Dialog({
            title: game.i18n.localize("Juink.UseFateDice"),
            content: `
              <h2>${oriValue + game.i18n.localize("Juink.UseQuestion")}</h2>
            `,
            buttons: {
              confirm: {
                icon: '<i class="fas fa-check"></i>',
                label: "Confirm",
                callback: async () => {
                    await this.update({[`system.dice.${pos}`]: 0});
                    let context = game.i18n.localize("Juink.AfterUseFateDice") ;
                    ChatMessage.create({content: oriValue + context, speaker: ChatMessage.getSpeaker({actor: this})});
                }
              }
            },
            default: "confirm"
        }).render(true);
    }

    async changeDice(pos) {
        game.fateDiceDialog = new Dialog({
            title: game.i18n.localize("Juink.ChangeFateDice"),
            content: `
                <h2 style="font-weight: bold; text-align: center;">${game.i18n.localize("Juink.ChangeFateDice")}</h2>
                <div style="display: flex; gap: 6px; justify-content: center;">
                    <img onclick="onChange(1)" src="systems/juink/assets/dices/1.PNG" width=50 height=50>
                    <img onclick="onChange(2)" src="systems/juink/assets/dices/2.PNG" width=50 height=50>
                    <img onclick="onChange(3)" src="systems/juink/assets/dices/3.PNG" width=50 height=50>
                    <img onclick="onChange(4)" src="systems/juink/assets/dices/4.PNG" width=50 height=50>
                    <img onclick="onChange(5)" src="systems/juink/assets/dices/5.PNG" width=50 height=50>
                    <img onclick="onChange(6)" src="systems/juink/assets/dices/6.PNG" width=50 height=50>
                </div>
                <script>
                async function onChange(answer) {
                    let scenario = game.actors.get("${this.id}");
                    let name = "system.dice." + ${pos};
                    await scenario.update({[name]: Number(answer)});
                    let context = game.i18n.localize("Juink.AfterChangeFateDice") ;
                    ChatMessage.create({content: ${this.system.dice[pos]} + "->" + answer + context, speaker: ChatMessage.getSpeaker({actor: scenario})});
                    game.fateDiceDialog.close();
                }
                </script>
            `,
            buttons: {}
        }, {width: "150px"}).render(true);
    }

    async chargeDice() {
        let checkAndRandom = num => (num != 0) ? num : Math.floor(Math.random() * 6) + 1;
        
        let updates = {};
        for (let id of Object.keys(this.system.dice))
            updates[id] = checkAndRandom(this.system.dice[id]);
        await this.update({"system.dice": updates});
    
        let context = game.i18n.localize("Juink.ChargeFateDice") ;
        ChatMessage.create({content: context, speaker: ChatMessage.getSpeaker({actor: this})});
    }

    async purgeDice() {
        let updates = {};
        for (let id of Object.keys(this.system.dice))
            updates[id] = 0;
        await this.update({"system.dice": updates});
    
        let context = game.i18n.localize("Juink.PurgeFateDice") ;
        ChatMessage.create({content: context, speaker: ChatMessage.getSpeaker({actor: this})});
    }

    async toMessage(templateData, messageData) {

        templateData = foundry.utils.mergeObject({

        }, templateData);

        const parts = templateData.roll.dice.map(d => d.getTooltipData());
        templateData.parts = parts;

        const template = "systems/juink/templates/dice/roll-message.html";
        const html = await renderTemplate(template, templateData);

        // Prepare chat data
        messageData = foundry.utils.mergeObject({
            user: game.user.id,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            content: html,
            sound: CONFIG.sounds.dice,
            speaker: {
                actor: this
            }
        }, messageData);


        // Either create the message or just return the chat data
        const cls = getDocumentClass("ChatMessage");
        const msg = new cls(messageData);

        // Either create or return the data
        cls.create(msg.toObject(), { });
    }




}