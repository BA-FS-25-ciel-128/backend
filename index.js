import { exec } from "child_process";
import ffmpeg from 'ffmpeg-static';
import path from 'path';
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
// Add the new imports
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ Kein OpenAI API-Schlüssel gesetzt!");
  process.exit(1); // Beendet die App sofort
}
const openai = new OpenAI({ apiKey });

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "9BWtsMINqrJLrRacOk9x";

// AWS konfigurieren - Sie benötigen AWS-Zugangsdaten
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const speechCache = new Map();

// Amazon Polly TTS mit Viseme-Unterstützung
const generateSpeechWithVisemes = async (text) => {
  try {
    // Check cache first
    const cacheKey = `${text}_Matthew_en-US`;
    if (speechCache.has(cacheKey)) {
      console.log("Using cached speech data");
      return speechCache.get(cacheKey);
    }

    console.log(`Starte Amazon Polly für: "${text}"`);
    const time = new Date().getTime();

    // Basis-Parameter für beide Anfragen
    const baseParams = {
      Text: text,
      VoiceId: 'Matthew', // Hier können Sie die Stimme ändern
      LanguageCode: 'en-US'
    };

    // 1. Audio-Datei generieren
    const audioParams = {
      ...baseParams,
      OutputFormat: 'mp3',
    };

    // 2. Viseme-Markierungen generieren
    const visemeParams = {
      ...baseParams,
      OutputFormat: 'json',
      SpeechMarkTypes: ['viseme']
    };

    // Run both requests in parallel
    console.log("Generiere Audio und Viseme-Daten parallel...");
    const [audioResponse, markResponse] = await Promise.all([
      pollyClient.send(new SynthesizeSpeechCommand(audioParams)),
      pollyClient.send(new SynthesizeSpeechCommand(visemeParams))
    ]);

    // Process audio data
    const audioBuffer = await audioResponse.AudioStream.transformToByteArray();

    // Process viseme data
    const markBuffer = await markResponse.AudioStream.transformToByteArray();
    const markString = new TextDecoder().decode(markBuffer);
    const visemeMarks = markString.trim().split('\n').map(JSON.parse);

    // Konvertiere in Rhubarb-ähnliches Format für Kompatibilität mit bestehendem Code
    const rhubarbFormat = {
      mouthCues: []
    };

    // Viseme mapping object for faster lookups
    const visemeMapping = {
      "p": "A",
      "t": "B", "T": "B", "k": "B", "i": "B", "r": "B", "s": "B",
      "e": "C",
      "a": "D",
      "@": "E", "E": "E", "S": "E",
      "u": "F", "o": "F", "O": "F",
      "f": "G",
      "l": "H"
    };

    // Process mouth cues more efficiently
    const marksLength = visemeMarks.length;
    for (let i = 0; i < marksLength; i++) {
      const mark = visemeMarks[i];
      const endTime = (i < marksLength - 1)
        ? visemeMarks[i + 1].time / 1000
        : (mark.time + mark.duration) / 1000;

      // Use mapping object instead of switch statement
      const visemeValue = visemeMapping[mark.value] || "X";

      rhubarbFormat.mouthCues.push({
        start: mark.time / 1000,
        end: endTime,
        value: visemeValue
      });
    }

    console.log(`Polly TTS abgeschlossen in ${new Date().getTime() - time}ms`);

    // Convert buffer to Base64
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    const result = {
      audio: audioBase64,
      lipsync: rhubarbFormat
    };

    // Cache the result
    speechCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Fehler bei Amazon Polly:", error);
    throw error;
  }
};

const lipSyncMessage = async (message, index) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${index}: "${message}"`);


  await execCommand(
    `"${ffmpeg}" -y -i audios/message_${index}.mp3 audios/message_${index}.wav`
    // -y to overwrite the file
  );

  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  const rhuarbPath = path.resolve('./bin/Rhubarb-Lip-Sync-1.13.0-Windows/rhubarb');
  await execCommand(
    `"${rhuarbPath}" -f json -o audios/message_${index}.json audios/message_${index}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);

};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }


  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "angry",
          animation: "Angry",
        },
        {
          text: "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          lipsync: await readJsonTranscript("audios/api_1.json"),
          facialExpression: "smile",
          animation: "Laughing",
        },
      ],
    });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    max_tokens: 1000,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: `
        You are a virtual girlfriend.
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry. 
        `,
      },
      {
        role: "user",
        content: userMessage || "Hello",
      },
    ],
  });

  let messages = JSON.parse(completion.choices[0].message.content);
  if (messages.messages) {
    messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  }
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    // generate audio file
    const textInput = message.text; // The text you wish to convert to speech

    try {
      // Amazon Polly für TTS und Viseme-Daten verwenden
      console.log(`Verarbeite Nachricht ${i}: "${textInput.substring(0, 30)}..."`);
      const pollyOutput = await generateSpeechWithVisemes(textInput);

      // Die generierte Audio und Viseme-Daten direkt zur Nachricht hinzufügen
      message.audio = pollyOutput.audio;
      message.lipsync = pollyOutput.lipsync;

      console.log(`Nachricht ${i} erfolgreich verarbeitet.`);
    } catch (error) {
      console.error(`Fehler bei Nachricht ${i}:`, error);

      var outputBaseName = `audios/message_${i}`
      // Fallback zur bisherigen ElevenLabs + Rhubarb Methode
      console.log("Verwende Fallback-Methode...");
      const fileName = `${outputBaseName}.mp3`;

      await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
      await lipSyncMessage(textInput, i);

      message.audio = await audioFileToBase64(fileName);
      message.lipsync = await readJsonTranscript(`${outputBaseName}.json`);
    }
  }

  res.send({ messages });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};


app.listen(port, () => {
  console.log(`Virtual Girlfriend listening on port ${port}`);
});
