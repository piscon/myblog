#!/usr/bin/env python3
"""生成 3 秒双音 WAV（模拟一段钢琴的两个音），供原型 audio 组件演示。"""
import wave, math, struct

SR = 22050
out = wave.open("/home/piscon/codespace/myblog/原型/assets/piano-note-8c2f.wav", "w")
out.setnchannels(1); out.setsampwidth(2); out.setframerate(SR)

def note(freq, dur, amp=0.5, decay=6.0):
    frames = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        env = math.exp(-decay * t) * (1 - math.exp(-80 * t))
        # 基频 + 2 次泛音，模拟琴弦
        v = amp * env * (math.sin(2*math.pi*freq*t) + 0.35*math.sin(4*math.pi*freq*t) + 0.12*math.sin(6*math.pi*freq*t))
        frames.append(v)
    return frames

samples = note(329.63, 1.6) + note(392.00, 1.5)  # E4 -> G4
# 轻限幅
peak = max(abs(s) for s in samples)
k = 0.82 / peak
out.writeframes(b"".join(struct.pack("<h", int(s*k*32767)) for s in samples))
out.close()
print("ok")
