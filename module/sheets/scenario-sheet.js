/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class JuinkScenarioSheet extends ActorSheet {

    /** @override */
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        classes: ["juink", "sheet", "scenario"],
        width: 600,
        height: 600,
        tabs: [
            {navSelector: ".tabs", contentSelector: ".scenario-contents", initial: "event"},
        ],
        dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
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

        actorData.otherEventList = [];
        actorData.selectEventList = [];
        actorData.otherIdentityList = [];
        actorData.selectIdentityList = [];

        for (let i of data.items) {
            if (i.type == 'event') {
                if (i.system.life.value >= i.system.life.max || i.system.select)
                    actorData.selectEventList.push(i);
                else
                    actorData.otherEventList.push(i);
            }
            else if (i.type == 'identity') {
                if (i.system.obtain)
                    actorData.selectIdentityList.push(i);
                else
                    actorData.otherIdentityList.push(i);
            }
        }

        data.enrichedDescription = await TextEditor.enrichHTML(data.system.description, {async: true});

        return data;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    async activateListeners(html) {
        super.activateListeners(html);

        html.find(".show-item").click(async event => {
            event.preventDefault();
            const li = event.currentTarget.closest(".item");
            const item = this.actor.items.get(li.dataset.itemId);
            item.sheet.render(true);
        });

        html.find(".delete-item").click(async event => {
            event.preventDefault();
            const li = event.currentTarget.closest(".item");
            const item = this.actor.items.get(li.dataset.itemId);
            await item.delete();
        });

        html.find(".event-select").click(async event => {
            event.preventDefault();
            const li = event.currentTarget.closest(".item");
            const item = this.actor.items.get(li.dataset.itemId);
            await item.update({'system.select': !item.system.select});
        });
        
        html.find(".change-event").change(async event => {
            event.preventDefault();
            const li = event.currentTarget.closest(".item");
            const item = this.actor.items.get(li.dataset.itemId);
            let name = $(event.currentTarget)[0].dataset.name;
            let val = $(event.currentTarget).val();
            await item.update({[name]: val});
        });

        html.find(".fate-dices .title").click(async () => await this.document.chargeDice());
        html.find(".dice").on('mousedown', async event => {
            let pos = $(event.currentTarget)[0].dataset.pos;
            if (event.button == 2 || event.which == 3)
                this.document.useDice(pos);
            else 
                this.document.changeDice(pos);
        });

    }
  
    /* -------------------------------------------- */
  
    /** @override */
    setPosition(options={}) {
        const position = super.setPosition(options);
        return position;
    }

    /* -------------------------------------------- */

    /** @override */
    async _onDropItem(event, data) {
        if ( !this.actor.isOwner ) return false;
        const item = await Item.implementation.fromDropData(data);
        
        if (item.type != "event" && item.type != 'identity') {
            ui.notifications.info(game.i18n.localize("Juink.Error.NotSupportItem"));
            return;
        }

        return super._onDropItem(event, data);
      }
    
    /* -------------------------------------------- */



}