"""Original TGIF concept cue. All instruments synthesized; no external samples."""
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write

SR = 44100
BPM = 116
BEAT = 60 / BPM
BARS = 16
DURATION = BARS * 4 * BEAT + 2.4
N = int(DURATION * SR)
OUT = Path(__file__).parent
rng = np.random.default_rng(1959)
drums = np.zeros((N, 2), dtype=np.float64)
music = np.zeros((N, 2), dtype=np.float64)
bassbus = np.zeros((N, 2), dtype=np.float64)

def hz(m): return 440 * 2 ** ((m - 69) / 12)
def time(d): return np.arange(int(d * SR)) / SR
def filt(y, cutoff, kind='lowpass', order=2):
    return sosfilt(butter(order, cutoff, kind, fs=SR, output='sos'), y)
def envelope(t, attack=.008, decay=.18, sustain=.5, release=.09):
    a = np.minimum(t / attack, 1)
    d = sustain + (1-sustain)*np.exp(-np.maximum(t-attack,0)/decay)
    r = np.minimum((t[-1]-t)/release, 1)
    return a*d*np.maximum(r,0)
def add(bus, y, beat, amp=1, pan=0):
    i = round(beat * BEAT * SR)
    end = min(i+len(y),N)
    y = y[:end-i]*amp
    bus[i:end,0] += y*np.sqrt((1-pan)/2)
    bus[i:end,1] += y*np.sqrt((1+pan)/2)

def key(note, duration):
    t=time(duration); f=hz(note)
    mod = 1.9*np.exp(-t/.18) + .14
    a=np.sin(2*np.pi*f*t + mod*np.sin(2*np.pi*f*2*t))
    b=.23*np.sin(2*np.pi*f*1.0018*t + .65*np.sin(2*np.pi*f*t))
    return filt((a+b)*envelope(t,.004,.22,.20,.16),6500)

def pad(note, duration):
    t=time(duration); f=hz(note)
    y=.65*np.sin(2*np.pi*f*t)+.23*np.sin(2*np.pi*f*1.003*t)+.12*np.sin(2*np.pi*f*2*t)
    return y*envelope(t,.19,.8,.6,.28)

def bass(note,duration):
    t=time(duration); f=hz(note)
    y=np.sin(2*np.pi*f*t)+.29*np.sin(2*np.pi*f*2*t)+.13*np.sin(2*np.pi*f*3*t)
    return y*envelope(t,.006,.13,.39,.045)

def lead(note,duration):
    t=time(duration); f=hz(note)
    phase=2*np.pi*f*t + .025*np.sin(2*np.pi*5.3*t)
    y=np.sin(phase)+.22*np.sin(phase*2)+.14*np.sin(phase*3)+.04*np.sin(phase*4)
    return filt(y*envelope(t,.018,.12,.62,.10),4400)

def kick():
    t=time(.36)
    phase=2*np.pi*(48*t+85*.022*(1-np.exp(-t/.022)))
    y=np.sin(phase)*np.exp(-t/.105)
    y+=filt(rng.normal(size=len(t)),1500)*np.exp(-t/.006)*.065
    return y*(1-np.exp(-t/.001))

def snare():
    t=time(.24)
    n=filt(filt(rng.normal(size=len(t)),500,'highpass'),6800)
    env=np.exp(-t/.075)*(1-np.exp(-t/.001))
    gate=np.clip((.20-t)/.03,0,1)
    tone=.30*np.sin(2*np.pi*190*t)*np.exp(-t/.033)
    return (n*.5*env+tone)*gate

def hat(openhat=False):
    t=time(.21 if openhat else .065)
    n=filt(rng.normal(size=len(t)),6500,'highpass')
    return n*np.exp(-t/(.055 if openhat else .017))*(1-np.exp(-t/.0005))

def clap():
    t=time(.18)
    n=filt(filt(rng.normal(size=len(t)),1000,'highpass'),4600)
    env=np.exp(-t/.040)
    env += .8*np.where(t>.012,np.exp(-(np.maximum(t-.012,0))/.023),0)
    env += .5*np.where(t>.024,np.exp(-(np.maximum(t-.024,0))/.028),0)
    return n*env

def bell(note):
    t=time(.65); f=hz(note)
    return (np.sin(2*np.pi*f*t)*np.exp(-t/.18)+.35*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.07))*(1-np.exp(-t/.001))

# Dmaj7, Bm7, Em7, A9, Dmaj7, F#m7, Gmaj7, A7;
# Bm7, Gmaj7, D/F#, A7, Em7, A9, Dmaj7, D6.
chords=[
    (38,[61,64,66,69]), (35,[57,62,66,69]), (40,[59,62,66,67]), (33,[55,59,61,64]),
    (38,[61,64,66,69]), (42,[57,61,64,68]), (31,[59,62,66,69]), (33,[55,61,64,67]),
    (35,[57,62,66,69]), (31,[59,62,66,69]), (42,[57,62,66,69]), (33,[55,61,64,67]),
    (40,[59,62,66,67]), (33,[55,59,61,64]), (38,[61,64,66,69]), (38,[59,62,66,69])]
for bar,(root,notes) in enumerate(chords):
    b=bar*4
    # Sustained warm texture, wide but quiet.
    for j,note in enumerate(notes):
        add(music,pad(note,BEAT*3.95),b,.025,(-.65,-.2,.2,.65)[j])
    # Offbeat FM keyboard comp, with a simpler first bar.
    comp=[0,1.5,2.5,3.5] if bar else [0,2.5]
    if bar==15: comp=[0]
    for k in comp:
        for j,note in enumerate(notes):
            add(music,key(note,BEAT*(1.2 if k==0 else .72)),b+k,.050 if k==0 else .038,(-.4,-.14,.14,.4)[j])
    # Tight melodic bass with octave and fifth pickups.
    pattern=[(0,root,.7),(1,root,.38),(1.75,root+12,.2),(2.5,root+7,.38),(3.25,root+12,.23),(3.75,root,.2)]
    if bar==0: pattern=[(0,root,1),(2.5,root+12,.5)]
    if bar==15: pattern=[(0,root,2.5)]
    for off,note,d in pattern:
        add(bassbus,bass(note,d*BEAT),b+off,.20)
    # Drums enter in stages, full backbeat after intro.
    if bar<15:
        for off in ([0,2] if bar<2 else [0,1.5,2,3.5]):
            add(drums,kick(),b+off,.38)
        if bar>=1:
            for off in [1,3]:
                add(drums,snare(),b+off,.30,.02)
                if bar>=4: add(drums,clap(),b+off+.018,.085,-.14)
        for j in range(8):
            swing=.035 if j%2 else 0
            add(drums,hat(j in [3,7] and bar>=2),b+j/2+swing,.067 if j%2 else .044,.28 if j%2 else -.2)
        if bar in [3,7,11,13]:
            for k,off in enumerate([3.25,3.5,3.75]):
                add(drums,snare(),b+off,.10+.03*k,(-.25,0,.25)[k])

# Original four-bar melodic phrase, with a small variation on its return.
melody=[
    [(0.5,74,.5),(1.25,78,.5),(2,81,.7),(3,78,.45),(3.5,76,.45)],
    [(0,74,.8),(1.25,73,.4),(2,71,.6),(3,74,.6)],
    [(0.5,76,.45),(1.25,78,.45),(2,79,.8),(3.25,78,.45)],
    [(0,76,.7),(1,73,.45),(1.75,71,.4),(2.5,73,.9)],
]
for bar in range(4,12):
    for off,note,d in melody[(bar-4)%4]:
        if bar>=8 and off==2: note+=12
        add(music,lead(note,d*BEAT),bar*4+off,.10,.10)
for off,note,d in [(0.5,76,.5),(1.25,79,.5),(2,83,.7),(3,81,.8)]:
    add(music,lead(note,d*BEAT),48+off,.10,.10)
for off,note,d in [(0,79,.6),(1,78,.6),(2,76,.5),(3,73,.7)]:
    add(music,lead(note,d*BEAT),52+off,.10,.10)
for off,note,d in [(0,74,1.2),(1.5,78,.45),(2,81,.6),(3,86,.7)]:
    add(music,lead(note,d*BEAT),56+off,.11,.10)
add(music,lead(86,BEAT*2.5),60,.095,.10)
add(drums,kick(),60,.34)
for off,note in [(0,74),(.25,78),(.5,81),(1,86)]:
    add(music,bell(note),60+off,.045,0)
add(music,bell(81),0,.05,-.1)

# Bounded short stereo echoes and a quiet room; no external effect samples.
wet=np.zeros_like(music)
for delay,amount in [(BEAT*.75,.12),(BEAT*1.5,.055),(.061,.07),(.097,.05),(.137,.035)]:
    shift=int(delay*SR)
    wet[shift:,0]+=music[:-shift,1]*amount
    wet[shift:,1]+=music[:-shift,0]*amount
mix=music+wet+bassbus+drums
# Gentle bus saturation; normalize to -1.2 dBFS and apply the ending tail fade.
mix=np.tanh(mix*1.12)
mix-=mix.mean(axis=0)
mix*=10**(-1.2/20)/np.max(np.abs(mix))
fade=int(1.5*SR)
mix[-fade:]*=np.linspace(1,0,fade)[:,None]
mix[:int(.008*SR)]*=np.linspace(0,1,int(.008*SR))[:,None]
wav=OUT/'friday-release-sketch.wav'
write(wav,SR,np.round(mix*32767).astype(np.int16))
print({'file':str(wav),'seconds':len(mix)/SR,'bpm':BPM,'peak_dbfs':20*np.log10(np.max(np.abs(mix))),'rms_dbfs':20*np.log10(np.sqrt(np.mean(mix**2))),'nonfinite':int(np.sum(~np.isfinite(mix)))})
