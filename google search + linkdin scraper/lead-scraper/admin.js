#!/usr/bin/env node

import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';

const USERS_FILE = 'users.json';
const ADMIN_PASSWORD = 'admin123'; // Change this in production!

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      process.stdout.write(question);
      process.stdin.on('data', char => {
        char = char + '';
        switch (char) {
          case '\n': case '\r': case '\u0004':
            process.stdout.write('\n');
            rl.close();
            break;
          default:
            process.stdout.write('*');
            break;
        }
      });
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function login() {
  const username = await prompt('Username: ');
  const password = await prompt('Password: ', true);
  const users = loadUsers();
  const admin = users.find(u => u.username === username && u.role === 'admin');
  if (admin && admin.password === password) return true;
  if (username === 'admin' && password === ADMIN_PASSWORD) return true;
  console.log('❌ Invalid credentials.');
  return false;
}

function generateUserId() {
  return crypto.randomBytes(4).toString('hex');
}

function printUsers(role) {
  const users = loadUsers().filter(u => u.role === role);
  if (users.length === 0) {
    console.log(`No ${role}s found.`);
    return;
  }
  users.forEach(u => {
    console.log(`ID: ${u.id} | Username: ${u.username}`);
  });
}

async function addUser(role = 'user') {
  const username = await prompt('Enter username: ');
  const apiKey1 = await prompt('Enter Google API Key 1: ');
  const apiKey2 = await prompt('Enter Google API Key 2: ');
  const id = generateUserId();
  let password = '';
  if (role === 'admin') password = await prompt('Set admin password: ');
  const users = loadUsers();
  users.push({ id, username, apiKeys: [apiKey1, apiKey2], role, password });
  saveUsers(users);
  console.log(`✅ ${role.charAt(0).toUpperCase() + role.slice(1)} added! User ID: ${id}`);
}

async function adminMenu() {
  while (true) {
    console.log('\nAdmin Menu:');
    console.log('1. Add user');
    console.log('2. Add admin');
    console.log('3. See users');
    console.log('4. See admins');
    console.log('5. Exit');
    const choice = await prompt('Choose an option: ');
    if (choice === '1') await addUser('user');
    else if (choice === '2') await addUser('admin');
    else if (choice === '3') printUsers('user');
    else if (choice === '4') printUsers('admin');
    else if (choice === '5') break;
    else console.log('Invalid option.');
  }
}

(async function main() {
  console.log('Welcome to Admin CLI');
  const ok = await login();
  if (!ok) return;
  await adminMenu();
})();
