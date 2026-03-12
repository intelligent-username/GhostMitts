import os
import asyncio
import edge_tts

VOICE_ID = "en-US-GuyNeural" 
WORDS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "JAB", "CROSS", "FRONT HOOK", "REAR HOOK", "FRONT UPPERCUT", "REAR UPPERCUT", "OVERHAND LEFT", "OVERHAND RIGHT", "LEAD KNEE", "REAR KNEE", "LEAD KICK", "REAR KICK", "BODY KICK", "ROUNDHOUSE KICK", "TEEP", "LOW KICK", "HEAD KICK", "CHECK KICK", "BLOCK", "PARRY LEFT", "PARRY RIGHT", "SLIP LEFT", "SLIP RIGHT"]

os.makedirs(VOICE_ID, exist_ok=True)

async def generate_countdown():
    for i, word in enumerate(WORDS, start=1):
        filename = f"n{i:02d}_{word.replace(' ', '_')}"
        print(f"Generating aggressive: {word}...")
        import subprocess

        file_path_mp3 = os.path.join(VOICE_ID, f"{filename}.mp3")
        file_path_ogg = os.path.join(VOICE_ID, f"{filename}.ogg")
        
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
        
        # Clean up the bloated MP3 file
        if os.path.exists(file_path_mp3):
            os.remove(file_path_mp3)
            
        print(f"Saved {file_path_ogg}")

if __name__ == "__main__":
    asyncio.run(generate_countdown())
