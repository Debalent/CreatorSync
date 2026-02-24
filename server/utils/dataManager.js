const fs = require('fs').promises;
const path = require('path');

class DataManager {
    constructor () {
        this.dataDir = path.join(__dirname, '../../data');
    }

    async readData (fileName) {
        try {
            const filePath = path.join(this.dataDir, fileName);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return { users: [], beats: [] }[fileName.replace('.json', '')] || {};
            }
            throw error;
        }
    }

    async writeData (fileName, data) {
        try {
            const filePath = path.join(this.dataDir, fileName);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            throw error;
        }
    }

    async addUser (user) {
        const data = await this.readData('users.json');
        data.users.push(user);
        await this.writeData('users.json', data);
    }

    async findUserByEmail (email) {
        const data = await this.readData('users.json');
        return data.users.find(user => user.email === email);
    }

    async findUserById (id) {
        const data = await this.readData('users.json');
        return data.users.find(user => user.id === id);
    }

    async updateUser (id, updates) {
        const data = await this.readData('users.json');
        const index = data.users.findIndex(user => user.id === id);
        if (index !== -1) {
            data.users[index] = { ...data.users[index], ...updates };
            await this.writeData('users.json', data);
        }
    }

    async addBeat (beat) {
        const data = await this.readData('beats.json');
        data.beats.push(beat);
        await this.writeData('beats.json', data);
    }

    async getAllBeats () {
        const data = await this.readData('beats.json');
        return data.beats;
    }

    async findBeatById (id) {
        const data = await this.readData('beats.json');
        return data.beats.find(beat => beat.id === id);
    }

    async updateBeat (id, updates) {
        const data = await this.readData('beats.json');
        const index = data.beats.findIndex(beat => beat.id === id);
        if (index !== -1) {
            data.beats[index] = { ...data.beats[index], ...updates };
            await this.writeData('beats.json', data);
        }
    }
}

module.exports = new DataManager();
