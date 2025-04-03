import { Telegraf, Context } from 'telegraf';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

// Токен вашего бота
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('Telegram bot token is not defined in .env file!');
    process.exit(1);
}

const bot: Telegraf<Context> = new Telegraf(token);

// Путь к whisper.cpp (измените на свой)
const whisperCppPath = process.env.WHISPER_CPP_PATH; // e.g., /opt/whisper.cpp/main
const whisperModelPath = process.env.WHISPER_MODEL_PATH; // e.g., /opt/whisper.cpp/models/ggml-base.en.bin

// Временная директория для сохранения голосовых сообщений
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
}

// Функция для транскрибации аудио с использованием whisper.cpp
async function transcribeAudio(audioFilePath: string): Promise<string> {
    try {
        const command = `${whisperCppPath} -m ${whisperModelPath} -f ${audioFilePath} -l ru`;
        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
            console.error(`whisper.cpp stderr: ${stderr}`);
        }

        // Extract the transcription from the output (this might need adjustment
        // depending on the exact output format of whisper.cpp)
        const transcription = stdout.trim(); // Simplest approach

        // More robust extraction (assuming each line starting with "\[00:..." is a segment):
        // const segments = stdout.split('\n').filter(line => line.startsWith('[00:'));
        // const transcription = segments.map(segment => segment.split('] ')[1]).join(' ');

        return transcription;

    } catch (error) {
        console.error(`Ошибка при транскрибации: ${error}`);
        return 'Произошла ошибка при транскрибации.';
    }
}

// Обработчик голосовых сообщений
bot.on('voice', async (context) => {
    try {
        const voice = context.message.voice;
        const fileLink = await bot.telegram.getFileLink(voice.file_id);
        const oggFilePath = path.join(tmpDir, `${voice.file_unique_id}.ogg`);
        const wavFilePath = path.join(tmpDir, `${voice.file_unique_id}.wav`);

        // Download the voice file
        const response = await fetch(fileLink.href);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fsPromises.writeFile(oggFilePath, buffer);

        // Convert .ogg to .wav using ffmpeg (you need ffmpeg installed)
        const ffmpegCommand = `ffmpeg -i ${oggFilePath} -acodec pcm_s16le -ac 1 -ar 16000 ${wavFilePath}`;
        await execAsync(ffmpegCommand);

        // Transcribe the audio
        const transcription = await transcribeAudio(wavFilePath);

        // Reply with the transcription
        await context.reply(`Транскрипция:\n${transcription}`);

        // Clean up temporary files
        await fsPromises.unlink(oggFilePath);
        await fsPromises.unlink(wavFilePath);

    } catch (error) {
        console.error(`Ошибка при обработке голосового сообщения: ${error}`);
        await context.reply('Произошла ошибка при обработке голосового сообщения.');
    }
});

bot.start((ctx) => ctx.reply('Привет! Отправьте мне голосовое сообщение, и я попробую его расшифровать.'));

bot.launch()
    .then(() => console.log('Бот запущен'))
    .catch((err) => console.error('Ошибка запуска бота:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

