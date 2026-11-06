"""Render two original, seamless electronic racing loops. No sampled recordings.
Requires Python 3, numpy, scipy and ffmpeg. Run from the project root.
"""
import math
import pathlib
import subprocess
import tempfile
import wave

import numpy as np
from scipy.signal import butter, sosfilt

RATE = 32000
OUT = pathlib.Path(__file__).resolve().parents[1] / 'dist/assets/audio'
OUT.mkdir(parents=True, exist_ok=True)


def make_track(filename, bpm, key, mood, seed):
    beat = 60 / bpm
    duration = beat * 128  # 32 bars, with a bridge and a full final phrase.
    size = round(duration * RATE)
    mix = np.zeros((size, 2), dtype=np.float64)
    music = np.zeros_like(mix)
    rng = np.random.default_rng(seed)

    def add(signal, at, level=1, pan=0, musical=False):
        idx = (round(at * RATE) + np.arange(len(signal))) % size
        bus = music if musical else mix
        bus[idx, 0] += signal * level * math.sqrt((1 - pan) / 2)
        bus[idx, 1] += signal * level * math.sqrt((1 + pan) / 2)

    def note(midi, length, kind='pluck'):
        t = np.arange(round((length + .08) * RATE)) / RATE
        f = 440 * 2 ** ((midi - 69) / 12)
        if kind == 'bass':
            sound = np.sin(2*np.pi*f*t) + .24*np.sin(2*np.pi*f*2*t) + .1*np.sin(2*np.pi*f*3*t)
            env = np.minimum(t/.006, 1) * np.minimum((length+.08-t)/.09, 1) * np.exp(-t*2)
        elif kind == 'pad':
            sound = sum(np.sin(2*np.pi*f*(1+detune)*t) for detune in [-.003,0,.003]) / 3
            sound += .19 * np.sin(2*np.pi*f*2*t)
            env = np.minimum(t/.08,1) * np.minimum((length+.08-t)/.18,1)
        else:
            sound = np.sin(2*np.pi*f*t) + .28*np.sin(2*np.pi*f*2*t)*np.exp(-t*9) + .11*np.sin(2*np.pi*f*3*t)*np.exp(-t*15)
            env = (1-np.exp(-t*400))*np.exp(-t*(4 if kind=='lead' else 10))*np.minimum((length+.08-t)/.09,1)
        return sound * np.clip(env,0,1)

    def kick():
        t = np.arange(round(.36*RATE))/RATE
        phase = 2*np.pi*(47*t + 110*.025*(1-np.exp(-t/.025)))
        return np.sin(phase)*np.exp(-t*13)*(1-np.exp(-t*1800)) + rng.normal(size=len(t))*.035*np.exp(-t*150)

    def hat(length=.08):
        t=np.arange(round(length*RATE))/RATE
        noise=rng.normal(size=len(t))
        noise=sosfilt(butter(2,6800,'highpass',fs=RATE,output='sos'),noise)
        return noise*np.exp(-t/(length/6))*np.minimum(t/.001,1)

    def snare():
        t=np.arange(round(.2*RATE))/RATE
        noise=sosfilt(butter(2,[1300,9000],'bandpass',fs=RATE,output='sos'),rng.normal(size=len(t)))
        return noise*np.exp(-t*24)*.7 + np.sin(2*np.pi*185*t)*np.exp(-t*35)*.25

    # Relative pitches i - VI - III - VII; the night arrangement uses i - iv - VI - V.
    roots=[0,-4,3,-2] if mood=='day' else [0,5,-4,7]
    qualities=[(0,3,7,10),(0,4,7,11),(0,4,7,11),(0,4,7,10)] if mood=='day' else [(0,3,7,10),(0,3,7,10),(0,4,7,11),(0,3,7,10)]
    hooks=[[12,19,17,15,14,12,10,14],[12,15,19,22,19,17,15,14]]
    for bar in range(32):
        at=bar*4*beat
        chord_index=(bar//2)%4
        root=key+roots[chord_index]
        chord=[root+12+x for x in qualities[chord_index]]
        bridge=16<=bar<20
        for b in range(4):
            if not bridge or b in [0,2]: add(kick(),at+b*beat,.7)
            if b in [1,3] and not bridge: add(snare(),at+b*beat,.31,pan=.03)
        for step in range(8):
            if bridge and step%2==0: continue
            add(hat(.15 if step%2 else .065),at+step*beat/2,.15 if step%2 else .075,pan=(-.32 if step%2 else .32))
            bass_note=root-12+(12 if step in [3,7] else 0)
            add(note(bass_note,beat*.34,'bass'),at+step*beat/2+.025,.27,musical=True)
        for j,n in enumerate(chord):
            add(note(n,beat*3.7,'pad'),at+j*.009,.058 if not bridge else .09,pan=(j-1.5)*.35,musical=True)
        if not bridge:
            pattern=[0,2,1,3,2,0,3,1]
            for step in range(16):
                if bar<4 and step%2: continue
                n=chord[pattern[step%8]]+12
                sig=note(n,beat*.20)
                time=at+step*beat/4
                add(sig,time,.064 if step%2 else .086,pan=math.sin(step*.8)*.48,musical=True)
                add(sig,time+beat*.75,.02,pan=-math.sin(step*.8)*.6,musical=True)
        if bar>=4 and not bridge:
            hook=hooks[(bar//8)%2]
            for j,step in enumerate([0,1.5,2.5,3,4.5,5.5,6,7]):
                if bar%2==0 and j>4: continue
                n=key+12+hook[(j+bar%2*2)%8]
                sig=note(n,beat*.5,'lead')
                time=at+step*beat/2
                add(sig,time,.10,pan=-.12,musical=True)
                add(sig,time+beat*.75,.032,pan=.55,musical=True)
                add(sig,time+beat*1.5,.011,pan=-.6,musical=True)
        if bar%8==7:
            for j in range(4): add(snare(),at+(3+j*.25)*beat,.09+j*.025,pan=(j-1.5)*.15)
    # Gentle four-on-the-floor ducking keeps the bass and melody clear.
    phase=(np.arange(size)/RATE)%beat
    duck=.48+.52*(1-np.exp(-phase/.085))
    music*=duck[:,None]
    music+=np.roll(music,round(beat*.75*RATE),axis=0)[:,::-1]*.09
    mix+=music
    mix=np.tanh(mix*1.12)
    mix*=.89/max(np.max(np.abs(mix)),.01)
    # Circular reverberation and note tails have already wrapped into the start.
    pcm=(np.clip(mix,-1,1)*32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.wav') as tmp:
        with wave.open(tmp.name,'wb') as wav:
            wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(RATE);wav.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',tmp.name,'-codec:a','libmp3lame','-b:a','128k','-metadata',f'title={filename}','-metadata','artist=Velocity Rush Original Soundtrack',str(OUT/(filename+'.mp3'))],check=True)
    print(f'{filename}: {duration:.3f}s, {bpm} BPM, peak={np.max(np.abs(mix)):.3f}, RMS={np.sqrt(np.mean(mix**2)):.3f}')


make_track('sunline-drive',132,50,'day',75123)
make_track('night-pulse',140,45,'night',99873)
