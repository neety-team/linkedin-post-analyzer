# -*- coding: utf-8 -*-
"""GIF de lead magnet: infografia de 3 niveles siempre completa, con microanimaciones dentro
de cada tarjeta y bucle sin saltos (quieto para leer, se recoge, se monta). Molde: images.md §0b-GIF.
Los textos (titular, SUB, BTN, niveles) estan como constantes: se cambian por recurso.

Uso: python scripts/montar-gif-lead-magnet.py "<carpeta de salida>" <hoja-de-fotogramas.png>
Salida: "lead magnet webinar iker.gif" y su fija (.png y .jpg). Cambia los nombres al reutilizarlo."""
from PIL import Image, ImageDraw, ImageFont
import sys, math
OUT=sys.argv[1]; SHEET=sys.argv[2]; W=H=1080
MINT=(235,255,246); BER=(67,27,68); NAR=(254,130,56); WHITE=(255,255,255); AZ=(167,197,249)
GR=(128,108,130); LINE=(222,214,224)
T_AZ=(232,240,254); T_NAR=(255,238,226); T_BER=(240,232,241)
FD=r'C:/Users/LENOVO/AppData/Local/Microsoft/Windows/Fonts/'
def bri(sz,w=b'Bold'):
    f=ImageFont.truetype(FD+'BricolageGrotesque-VariableFont_opsz,wdth,wght.ttf',sz); f.set_variation_by_name(w); return f
SWR=lambda s:ImageFont.truetype(FD+'Switzer-Regular.otf',s); SWB=lambda s:ImageFont.truetype(FD+'Switzer-Bold.otf',s)
fT=bri(66,b'ExtraBold'); fSub=SWR(28); fChip=SWB(22); fTag=SWB(19); fCT=bri(36,b'Bold'); fCD=SWR(23); fFoot=SWB(18); fUI=SWB(17); fUIr=SWR(17); fP=SWB(32)
M=56

SUB='51 minutos de vídeo y 34 diapositivas para encontrarlos.'
BTN='Pulsa "ver más" y llévatelo sin comentar nada'
def _layout():
    d=ImageDraw.Draw(Image.new('RGB',(W,H)))
    top=56; b1=d.textbbox((0,0),'Clientes que tardas',font=fT); b2=d.textbbox((0,0),'meses en encontrar',font=fT); bs=d.textbbox((0,0),SUB,font=fSub)
    t1=top-b1[1]; t2=t1+82; sub=t2+(b2[3])+34-bs[1]
    subbot=sub+bs[3]
    ch=200; ph=66; bottom=H-56
    gap=(bottom-subbot-3*ch-ph)/4
    cards=[int(subbot+gap+k*(ch+gap)) for k in range(3)]
    py=int(cards[2]+ch+gap)
    return dict(t1=t1,t2=t2,sub=sub,cards=cards,ch=ch,py=py,gap=gap,subbot=subbot)
def ease(x): x=max(0,min(1,x)); return 1-(1-x)**3
def chip(d,x,y,txt):
    w=d.textlength(txt,font=fChip)+32
    d.rounded_rectangle((x,y,x+w,y+40),radius=20,fill=WHITE,outline=LINE,width=2)
    d.text((x+16,y+8),txt,font=fChip,fill=BER); return x+w+10
LAYOUT=_layout(); CARD_Y=LAYOUT['cards']; CH=LAYOUT['ch']; CW=W-2*M; PX=M+560; PW=CW-560-22; PH=CH-44
def card_static(d,i,tag,col,title,desc,foot):
    y=CARD_Y[i]; x=M
    d.rounded_rectangle((x,y,x+CW,y+CH),radius=24,fill=WHITE,outline=LINE,width=2)
    d.ellipse((x+28,y+28,x+40,y+40),fill=col)
    d.text((x+50,y+22),tag,font=fTag,fill=BER)
    tx=x+28; 
    for s,c in title:
        d.text((tx,y+56),s,font=fCT,fill=c); tx+=d.textlength(s,font=fCT)
    d.text((x+28,y+106),desc[0],font=fCD,fill=GR); d.text((x+28,y+134),desc[1],font=fCD,fill=GR)
def panel(d,i,tint):
    y=CARD_Y[i]+22; d.rounded_rectangle((PX,y,PX+PW,y+PH),radius=18,fill=tint); return PX,y
def ui1(d,t):
    # buscador: el filtro pasa de "Por sector" a "Por lo que hace" y salen filas
    x,y=panel(d,0,T_AZ)
    sw=ease((t%1.0)*3) if (t%1.0)<0.34 else 1.0
    # dos pastillas
    a=(x+18,y+16); b=(x+170,y+16)
    on=sw>0.5
    d.rounded_rectangle((a[0],a[1],a[0]+140,a[1]+34),radius=17,fill=WHITE if on else BER)
    d.text((a[0]+20,a[1]+7),'Por sector',font=fUI,fill=GR if on else WHITE)
    d.rounded_rectangle((b[0],b[1],b[0]+170,b[1]+34),radius=17,fill=BER if on else WHITE)
    d.text((b[0]+16,b[1]+7),'Por lo que hace',font=fUI,fill=WHITE if on else GR)
    if on:
        d.line((a[0]+16,a[1]+17,a[0]+124,a[1]+17),fill=GR,width=2)
    rows=3; ph=(t%1.0)
    for r in range(rows):
        k=ease((ph-0.34-r*0.12)*4)
        if k<=0: continue
        ry=y+64+r*24; w=int((PW-60)*k*(0.9-0.15*r))
        d.rounded_rectangle((x+18,ry,x+18+12,ry+12),radius=6,fill=AZ)
        d.rounded_rectangle((x+38,ry+2,x+38+w,ry+10),radius=4,fill=(200,214,240))
def ui2(d,t):
    # encargo a Claude: burbuja, y comprobaciones que se marcan
    x,y=panel(d,1,T_NAR); ph=t%1.0
    bw=int((PW-36)*ease(ph*3))
    d.rounded_rectangle((x+18,y+14,x+18+max(bw,40),y+44),radius=15,fill=WHITE)
    s='Las que no conozco y por qué encajan'
    if bw>PW-60: d.text((x+30,y+20),s,font=fUIr,fill=BER)
    for r in range(3):
        ry=y+58+r*26; k=ease((ph-0.3-r*0.13)*4)
        d.rounded_rectangle((x+18,ry+2,x+18+int((PW-90)*(0.85-0.12*r)),ry+12),radius=4,fill=(250,210,186))
        cx=x+PW-40
        if k>0:
            rr=int(11*min(1,k*1.2)); d.ellipse((cx-rr,ry+7-rr,cx+rr,ry+7+rr),fill=NAR)
            if k>0.6: d.line((cx-5,ry+7,cx-1,ry+11,cx+6,ry+2),fill=WHITE,width=3)
def ui3(d,t):
    # la empresa llega revisada y se pasa a contactar
    x,y=panel(d,2,T_BER); ph=t%1.0
    d.rounded_rectangle((x+18,y+14,x+PW-18,y+86),radius=14,fill=WHITE)
    d.rounded_rectangle((x+34,y+28,x+34+150,y+38),radius=4,fill=(214,198,216))
    d.rounded_rectangle((x+34,y+48,x+34+210,y+56),radius=4,fill=(230,220,231))
    d.rounded_rectangle((x+34,y+64,x+34+120,y+72),radius=4,fill=(230,220,231))
    k=ease((ph-0.15)*4)
    if k>0:
        bx=x+PW-140; by=y+26
        d.rounded_rectangle((bx,by,bx+int(108*k),by+30),radius=15,fill=NAR)
        if k>0.9: d.text((bx+14,by+5),'Revisada',font=fUI,fill=WHITE)
    k2=ease((ph-0.5)*4)
    bx=x+18; by=y+98
    fill=BER if k2>0.5 else WHITE
    d.rounded_rectangle((bx,by,bx+PW-36,by+34),radius=17,fill=fill,outline=BER,width=2)
    txt='Contactar'; tw=d.textlength(txt,font=fUI)
    d.text((bx+(PW-36-tw)/2,by+7),txt,font=fUI,fill=WHITE if k2>0.5 else BER)
def frame(t):
    im=Image.new('RGB',(W,H),MINT); d=ImageDraw.Draw(im)
    d.text((M,LAYOUT['t1']),'Clientes que tardas',font=fT,fill=BER)
    d.text((M,LAYOUT['t2']),'meses',font=fT,fill=NAR); xx=M+d.textlength('meses ',font=fT)
    d.text((xx,LAYOUT['t2']),'en encontrar',font=fT,fill=BER)
    d.text((M,LAYOUT['sub']),SUB,font=fSub,fill=GR)
    card_static(d,0,'NIVEL 1 · GRATIS',AZ,[('Busca por lo que ',BER),('hace',NAR)],('una empresa,','no por su sector.'),'01  Lo que hace + no el sector')
    card_static(d,1,'NIVEL 2 · CON CLAUDE',NAR,[('Saca las que ',BER),('no conoces',NAR)],('y comprueba que encajan','antes de llamar.'),'02  Encargo + comprobación')
    card_static(d,2,'NIVEL 3 · CÓMO LO HACEMOS',BER,[('Cada empresa, ',BER),('revisada',NAR)],('y tu tiempo va','a contactar.'),'03  Revisada + contactar')
    ui1(d,t); ui2(d,t); ui3(d,t)
    py=LAYOUT['py']; s=BTN
    bb=d.textbbox((0,0),s,font=fP,anchor='ls')   # caja real de la tinta sobre la linea base
    tw=bb[2]-bb[0]; th=bb[3]-bb[1]; padx=56; bw=tw+2*padx; bx=(W-bw)/2
    d.rounded_rectangle((bx,py,bx+bw,py+66),radius=33,fill=NAR)
    # centrado optico: la tinta de las mayusculas y minusculas sin descendentes, centrada en el alto
    ink=d.textbbox((0,0),'Pulsa ver mas llevatelo sin comentar nada',font=fP,anchor='ls')   # sin tildes ni descendentes
    base=py+33-(ink[1]+ink[3])/2
    d.text((bx+padx-bb[0],base),s,font=fP,fill=WHITE,anchor='ls')
    return im

FULL=1.0-1e-6
seq=[(FULL,2600)]
for k in range(1,11): seq.append((FULL*(1-k/10),55))          # se recoge
seq.append((0.0,250))
for k in range(1,31): seq.append((FULL*k/30,70))              # vuelve a montarse
frames=[frame(t) for t,_ in seq]; durs=[ms for _,ms in seq]
pal=[f.convert('P',palette=Image.ADAPTIVE,colors=160) for f in frames]
pal[0].save(OUT+'/lead magnet webinar iker.gif',save_all=True,append_images=pal[1:],duration=durs,loop=0,optimize=True)
frames[0].save(OUT+'/lead magnet webinar iker fija.png'); frames[0].save(OUT+'/lead magnet webinar iker fija.jpg',quality=95)
ts=[frames[k].resize((540,540)) for k in (0,6,12,30)]
s=Image.new('RGB',(1080,1080));[s.paste(t,((i%2)*540,(i//2)*540)) for i,t in enumerate(ts)];s.save(SHEET)
print(len(frames),sum(durs),'ms',{k:(round(v,1) if not isinstance(v,list) else v) for k,v in LAYOUT.items()})
d=ImageDraw.Draw(frames[0]); print('btn',d.textlength(BTN,font=fP),'sub',d.textlength(SUB,font=fSub))
