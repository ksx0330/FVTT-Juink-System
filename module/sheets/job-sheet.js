import { JuinkItemSheet } from "./item-sheet.js";

export class JuinkJobSheet extends JuinkItemSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["juink", "sheet", "item"],
            width: 480,
            height: 216,
            resizable: false
        });
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        html.find(".set-items").click(this._onSetItems.bind(this));
        html.find(".set-attributes").click(this._onSetAttributes.bind(this));

        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;
    }
    
    async _onSetItems(event) {
        event.preventDefault();

        let pack = game.settings.get("juink", "item-packs-name");

        let defaultItems = game.packs.get(pack).index.reduce((acc, e) => {
            if (e.type == "item")
                acc.push([e.sort, e.name, e._id, e.uuid]);
            return acc;
        }, []).sort((a, b) => a[0] - b[0]);

        console.log(defaultItems);


        let content = `
            <table style="text-align: center; word-break: keep-all;">
                <tr>
        `;
        for (let item of defaultItems)
            content += `<th>${item[1]}</th>`;
        content += `
                </tr>
                <tr>
        `;
        for (let item of defaultItems) {
            let val = (this.document.system.items[item[2]] != undefined) ? this.document.system.items[item[2]].value : "";
            content += `<td><input type="number" id="${item[2]}" value="${val}"></td>`;
        }
        content += `
                </tr>
            </table>
        `;

        let apply = async () => {
            let updates = {};
            for (let item of defaultItems) {
                updates[item[2]] = {
                    uuid: item[3],
                    value: Number($("#" + item[2]).val()),
                }

            }
            await this.document.update({"system.items": updates});
        }
    
        new Dialog({
            title: game.i18n.localize("TYPES.Item.item"),
            content: content,
            buttons: {
                "apply": {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("Juink.Apply"),
                    callback: apply
                },
                "reset": {
                    icon: '<i class="fas fa-refresh"></i>',
                    label: game.i18n.localize("Juink.Reset"),
                    callback: async () => {
                        let updates = {};
                        for (let item of Object.keys(this.document.system.items))
                            updates["system.items.-=" + item] = null;
                        await this.document.update(updates);
                    }
                }
                
            },
            close: apply
        }).render(true);
    }

    async _onSetAttributes(event) {
        event.preventDefault();

        let apply = async () => {
            let updates = {
                "str": { "value": Number($("#job-str").val()) },
                "agi": { "value": Number($("#job-agi").val()) },
                "int": { "value": Number($("#job-int").val()) },
                "wil": { "value": Number($("#job-wil").val()) },
                "lck": { "value": Number($("#job-lck").val()) }
            };
            await this.document.update({"system.attributes": updates});
        }
    
        new Dialog({
            title: game.i18n.localize("Juink.Attributes"),
            content: `
                <table style="text-align: center;">
                    <tr>
                        <th>${game.i18n.localize("Juink.Str")}</th>
                        <th>${game.i18n.localize("Juink.Agi")}</th>
                        <th>${game.i18n.localize("Juink.Int")}</th>
                        <th>${game.i18n.localize("Juink.Wil")}</th>
                        <th>${game.i18n.localize("Juink.Lck")}</th>
                    </tr>
                    <tr>
                        <td><input type="number" id="job-str" value="${this.document.system.attributes.str.value}"></td>
                        <td><input type="number" id="job-agi" value="${this.document.system.attributes.agi.value}"></td>
                        <td><input type="number" id="job-int" value="${this.document.system.attributes.int.value}"></td>
                        <td><input type="number" id="job-wil" value="${this.document.system.attributes.wil.value}"></td>
                        <td><input type="number" id="job-lck" value="${this.document.system.attributes.lck.value}"></td>
                    </tr>
                </table>
            `,
            buttons: {
                "apply": {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("Juink.Apply"),
                    callback: apply
                }
                
            },
            close: apply
        }).render(true);
      }



}