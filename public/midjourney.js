const axios = require('axios');
const fs = require('fs');
const url = require('url');
const path = require('path');

class MidjourneyApi {
    constructor(prompt, config = {}) {
        this.application_id = config.application_id || "936929561302675456";
        this.guild_id = config.guild_id || "1144798388068560916";
        this.channel_id = config.channel_id || "1144798388538327134";
        this.version = config.version || "1118961510123847772";
        this.id = config.id || "938956540159881230";
        this.authorization = config.authorization || "MTEwNDE5MDg5ODk0MzgyMzkzMg.GJrHOW.mUi1JxBRs6jnwNOK5790qf5mqpkZF4s0nu9PIs";
        this.prompt = prompt;
        this.image_url = null;
        this.init();
    }

    async init() {
        await this.send_message();
        await this.get_message();
        await this.choose_images();
        await this.download_image();
    }

    async send_message() {
        const data = {
            type: 2,
            application_id: this.application_id,
            guild_id: this.guild_id,
            channel_id: this.channel_id,
            session_id: "69b36515e459325dbda355bfd50994c4",
            data: {
                version: this.version,
                id: this.id,
                name: "imagine",
                type: 1,
                options: [{
                    type: 3,
                    name: "prompt",
                    value: this.prompt
                }],
                application_command: {
                    id: this.id,
                    application_id: this.application_id,
                    version: this.version,
                    type: 1,
                    name: "imagine",
                    description: "Create images with Midjourney",
                    required: true
                },
                attachments: []
            }
        };

        const headers = {
            'Authorization': this.authorization,
            'Content-Type': 'application/json',
        };

        await axios.post('https://discord.com/api/v9/interactions', data, {
            headers: headers
        });
    }

    async get_message() {
        const headers = {
            'Authorization': this.authorization,
            'Content-Type': 'application/json',
        };

        for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 30000));
            const response = await axios.get(`https://discord.com/api/v9/channels/${this.channel_id}/messages`, {
                headers: headers
            });
            const messages = response.data;
            this.message_id = messages[0].id;
            const components = messages[0].components[0].components;
            const buttons = components.filter(comp => ['U1', 'U2', 'U3', 'U4'].includes(comp.label));
            const custom_ids = buttons.map(button => button.custom_id);
            this.custom_id = custom_ids[Math.floor(Math.random() * custom_ids.length)];
        }
    }

    async choose_images() {
        const data = {
            type: 3,
            guild_id: this.guild_id,
            channel_id: this.channel_id,
            message_flags: 0,
            message_id: this.message_id,
            application_id: this.application_id,
            session_id: "cannot be empty",
            data: {
                component_type: 2,
                custom_id: this.custom_id,
            }
        };

        const headers = {
            'Authorization': this.authorization,
            'Content-Type': 'application/json',
        };

        await axios.post('https://discord.com/api/v9/interactions', data, {
            headers: headers
        });
    }

    async download_image() {
        const headers = {
            'Authorization': this.authorization,
            'Content-Type': 'application/json',
        };

        for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 30000));
            const response = await axios.get(`https://discord.com/api/v9/channels/${this.channel_id}/messages`, {
                headers: headers
            });
            const messages = response.data;
            this.image_url = messages[0].attachments[0].url;
            const image_response = await axios.get(this.image_url, { responseType: 'arraybuffer' });
            const image_name = path.basename(url.parse(this.image_url).pathname);
            this.image_path_str = `images/${image_name}`;
            fs.writeFileSync(this.image_path_str, image_response.data);
        }
    }

    image_path() {
        return this.image_path_str;
    }
}

module.exports = MidjourneyApi;
