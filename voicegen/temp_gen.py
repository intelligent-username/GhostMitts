import os
import asyncio
import edge_tts
import subprocess

VOICE_ID = "en-US-GuyNeural"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "src", "public", "voicegen", VOICE_ID))

# Only the new Wrestling moves to generate (starting at index 52)
NEW_WORDS = [
    (52, "SHOOT"),
    (53, "DOWNBLOCK"),
    (54, "FRONT ROLL"),
    (55, "BACKWARD ROLL"),
    (56, "CIRCLE OFF"),
    (57, "LEVEL CHANGE"),
]

os.makedirs(OUTPUT_DIR, exist_ok=True)

async def generate_new_moves():
    for num, word in NEW_WORDS:
        filename = f"n{num:02d}_{word.replace(' ', '_')}"
        print(f"Generating aggressive: {word} -> {filename}...")

        file_path_mp3 = os.path.join(OUTPUT_DIR, f"{filename}.mp3")
        file_path_ogg = os.path.join(OUTPUT_DIR, f"{filename}.ogg")

        communicate = edge_tts.Communicate(
            word,
            VOICE_ID,
            rate="+60%",
            pitch="-20Hz",
            volume="+130%"
        )
        await communicate.save(file_path_mp3)

        # Strip silence and convert to Opus (.ogg) using ffmpeg
        cmd = [
            "ffmpeg", "-y", "-i", file_path_mp3,
            "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
            "-c:a", "libopus", "-b:a", "32k",
            file_path_ogg
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Clean up temporary MP3
        if os.path.exists(file_path_mp3):
            os.remove(file_path_mp3)

        print(f"Saved {file_path_ogg}")

if __name__ == "__main__":
    asyncio.run(generate_new_moves())
