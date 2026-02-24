const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

async function createTestUser() {
    const dataPath = path.join(__dirname, '..', 'data', 'users.json');

    // Read existing users
    let data = { users: [] };
    if (fs.existsSync(dataPath)) {
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        if (fileContent.trim()) {
            data = JSON.parse(fileContent);
        }
    }

    // Check if test user already exists
    const existingUser = data.users.find(u => u.email === 'test@creatorsync.com');
    if (existingUser) {
        console.log('✅ Test user already exists:');
        console.log('   Email: test@creatorsync.com');
        console.log('   Password: password123');
        return;
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const testUser = {
        id: uuidv4(),
        username: 'testuser',
        email: 'test@creatorsync.com',
        password: hashedPassword,
        role: 'user',
        subscription: {
            tier: 'Pro',
            status: 'active',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        },
        profile: {
            bio: 'Test user for development',
            avatar: 'https://via.placeholder.com/150',
            genres: ['Hip-Hop', 'Electronic', 'Trap'],
            socialLinks: {}
        },
        stats: {
            beatsSold: 0,
            totalEarnings: 0,
            followers: 0,
            following: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    data.users.push(testUser);

    // Save to file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    console.log('✅ Test user created successfully!');
    console.log('');
    console.log('📧 Email: test@creatorsync.com');
    console.log('🔑 Password: password123');
    console.log('👤 Username: testuser');
    console.log('💎 Subscription: Pro (active for 1 year)');
    console.log('');
    console.log('You can now log in with these credentials!');
}

createTestUser().catch(console.error);
