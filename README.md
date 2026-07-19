# 🤖 Discord Translation Bot (v1.3)

We're excited to share the latest updates to our Translation Bot (v1.3)! Developed with **Node.js**, this version brings much-requested features, improved performance, and more control over your server's translations.

# **Warning: This Bot Uses the Privileged Intent Condition**

## 🌍 Supported Languages

The translation bot supports **over 18 languages**!

* **Available languages:** Turkish, English, Spanish, Indonesian, Czech, German, Ukrainian, Portuguese, Russian, Chinese, French, Dutch, Hindi, Romanian, Swedish, Greek, Filipino, Persian, and Arabic.

---

## 🚀 So What Features Does Our Bot Have?

### 📋 Interactive Control Panel and Channel Management
Now you can set up interactive panels to keep your server organized and restrict bot commands to specific channels:
* **`/add-panel`**: Create and post an interactive translation panel for a specific channel.

* **`/add-channels`**: Restrict translation commands to only be used in designated channels.

### 🔓 History Command

Displays a maximum of 25 messages in a channel and translates the message you select.

Public and Private options are now separated into their own commands. You can use the option that best suits your server's privacy needs.

* **Public Options** (Visible to everyone in the channel)
* `/translate-history-public`
* `/translate-public`

* **Private Options** (Temporary replies visible only to the user)
* `/translate-history-private`

* `/translate-private`

## Panel Feature

This feature allows you to translate the next message based on it. It translates to your desired language with 18 button options and translates the message specifically for you.

* You can use it with the `/translate-the-panel` command.

---

## 🛠️ Installation and Settings (Node.js)

### Prerequisites

* [Node.js](https://nodejs.org/) (v18.x or higher)
* A Discord Bot Token (within Index.js)

The ID of the server you will use and Role IDs that will use the commands (in Index.js)
