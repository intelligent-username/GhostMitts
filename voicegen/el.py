import os
import asyncio
import edge_tts

# Steffan is typically a bit more punchy/gritty than Christopher
VOICE_ID = "en-US-GuyNeural" 
WORDS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "JAB", "CROSS", "FRONT HOOK", "REAR HOOK", "FRONT UPPERCUT", "REAR UPPERCUT", "OVERHAND LEFT", "OVERHAND RIGHT", "LEAD KNEE", "REAR KNEE", "LEAD KICK", "REAR KICK", "BODY KICK", "ROUNDHOUSE KICK", "TEEP", "LOW KICK", "HEAD KICK", "CHECK KICK", "BLOCK", "PARRY LEFT", "PARRY RIGHT", "SLIP LEFT", "SLIP RIGHT"]

os.makedirs(VOICE_ID, exist_ok=True)

async def generate_countdown():
    for i, word in enumerate(WORDS, start=1):
        filename = f"n{i:02d}_{word.replace(' ', '_')}"
        print(f"Generating aggressive: {word}...")
        file_path = os.path.join(VOICE_ID, f"{filename}.mp3")
        
        communicate = edge_tts.Communicate(
            word, 
            VOICE_ID, 
            rate="+60%", 
            pitch="-20Hz",
            volume="+130%"
        )
        await communicate.save(file_path)
        
        print(f"Saved {file_path}")

if __name__ == "__main__":
    asyncio.run(generate_countdown())
