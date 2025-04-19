# TalkyWalky Chat Application Backend

## Description

This project is part of our (Ilimea Gall and Jasmin Zuzo) Bachelor's thesis at [ZHAW](https://www.zhaw.ch/en/university) and shows a 3D-Avatar, called TalkyWalky, embedded in a chat environment. TalkyWalky takes on the role of an English teacher for children, responding with animations and expressions that match the current conversation. 

The goal of our thesis is to evaluate how effectively such an avatar can use OpenAI to deliver real-time responses with matching animations and to assess the effort required to achieve this. To do so, we defined reactions based on user expectations and extended the avatar with gestures, facial expressions, and other animations that can be triggered based on the content of each response. These enhancements aim to make the avatar more engaging and natural for the target audience, while ensuring that the animations feel fitting and not exaggerated.


This is the backend of the application, the frontend can be found [here](https://github.com/BA-FS-25-ciel-128/frontend).

Additionally, the blend file of the avatar TalkyWalky can be found [here](https://github.com/BA-FS-25-ciel-128/TalkyWalkyAvatar).

## Functionality

This backend service uses Express.js to power the conversational logic of TalkyWalky. It integrates several APIs:

- OpenAI API to generate contextually appropriate responses for children learning English

- Amazon Polly API for text-to-speech conversion and viseme data generation

- ElevenLabs API as a backup for generating speech when Amazon Polly is unavailable

The backend processes user messages, creates child-friendly responses with matching facial expressions and animations, turns the text into speech and generates viseme data for accurate lip synchronization.

## Background

The structure of this project is based on the [r3f-virtual-girlfriend-backend](https://github.com/wass08/r3f-virtual-girlfriend-backend) template created by [Wassim Samad](https://github.com/wass08). 
More details can be found in the corresponding [youtube video](https://www.youtube.com/watch?v=EzzcEL_1o9o).

## Getting Started

### Preparations

**OpenAI**
- Create an OpenAI account if you don't already have one.
-  Generate a new API key on [Platform OpenAI](https://platform.openai.com/api-keys). 
- Add sufficient credit (5$ is enough to get started) under [Billing](https://platform.openai.com/settings/organization/billing/overview).
- Copy your API key and paste it into the .env file using the following format:
 `OPENAI_API_KEY=your-api-key-here`

**Amazon PollyAPI**

- Create ...

TODO ask Ilimea

**ElevenLabs**

- 

TODO ask Ilimea

**Rhubarb Lipsync**

This is the fallback option for generating lip sync when the Polly API is unavailable. It takes significantly more time to generate the necessary data, but ensures functionality. Simply donwload the [RhubarbLibrary binary](https://github.com/DanielSWolf/rhubarb-lip-sync/releases) for your operating system and place it in your `bin` folder. Now the rhubarb executable can be accesed through `bin/rhubarb`.

**Start the application locally**

- Clone this repository
- Clone the frontend repository
- run `npm install`
- run `npm run dev`

