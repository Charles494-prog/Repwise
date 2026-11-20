// RepWise icon system: every emoji in the UI is swapped for a line-art SVG icon.
(function(){
const P={
trophy:'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z',
dumbbell:'M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21',
flame:'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
target:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
scale:'M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2',
walk:'M13 4a1.5 1.5 0 1 0 0-.01M10 21l2-6 2.5 2.5V21M12 15l-1-5 3-1 2 3h3M11 10l-3 2v3',
run:'M14 4a1.5 1.5 0 1 0 0-.01M5 21l4-6 3 2 1-4M8 10l4-2 3 3 3 1M13 13l3 3-1 5',
zap:'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
check:'M20 6 9 17l-5-5',
checkc:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 12l3 3 5-6',
x:'M18 6 6 18M6 6l12 12',
alert:'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
up:'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
down:'M22 17l-8.5-8.5-5 5L2 7M16 17h6v-6',
food:'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7',
lock:'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
swords:'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2',
timer:'M10 2h4M12 14l3-3M12 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
rocket:'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',
flask:'M9 3h6M10 3v6L4 20h16L14 9V3M7 15h10',
sparkle:'M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2zM19 3v4M17 5h4',
signal:'M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 20V4',
refresh:'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
party:'M5.8 11.3 2 22l10.7-3.8M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2ZM14 10l.6-.6c.6-.6 1.5-.7 2.2-.3M15 2v.01M22 8v.01M22 20v.01M4 3v.01M19 2l-1 3M22 13l-3 1',
chair:'M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0zM5 18v2M19 18v2',
ruler:'M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0ZM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2',
user:'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
drop:'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z',
plus:'M12 5v14M5 12h14',
aup:'M12 19V5M5 12l7-7 7 7',
adown:'M12 5v14M19 12l-7 7-7-7',
pause:'M7 4h3v16H7zM14 4h3v16h-3z',
pencil:'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
camera:'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
sprout:'M7 20h10M10 20c5.5-2.5.8-6.4 3-10M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z',
dna:'M2 15c6.67-6 13.33 0 20-6M2 9c6.67 6 13.33 0 20 6M6 10.5v3M12 9v6M18 10.5v3',
clip:'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h6',
home:'M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
dice:'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM8 8h.01M16 16h.01M12 12h.01M16 8h.01M8 16h.01',
crown:'M2 18 4 7l5 5 3-7 3 7 5-5 2 11zM2 21h20',
meat:'M15.4 15.63a7.88 6 135 1 1 6.23-6.23 4.3 3.3 135 0 0-6.23 6.23M8.29 12.71l-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59',
cal:'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18',
moon:'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
gauge:'M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0',
pill:'M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7ZM8.5 8.5l7 7',
coffee:'M10 2v2M14 2v2M6 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1',
bulb:'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4',
bone:'M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z',
smile:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
cookie:'M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5M8.5 8.5v.01M16 15.5v.01M12 12v.01M11 17v.01M7 14v.01',
heavy:'M12 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM3 21c0-5 4-8 9-8s9 3 9 8z',
cash:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 18V6',
code:'M16 18l6-6-6-6M8 6l-6 6 6 6',
game:'M6 12h4M8 10v4M15 13h.01M18 11h.01M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
offline:'M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2-1.3M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8a15 15 0 0 0-11.3-3.8M2 2l20 20',
leaf:'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10ZM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
chat:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
bot:'M12 8V4H8M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM2 14h2M20 14h2M15 13v2M9 13v2',
book:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM20 17v5H6.5a2.5 2.5 0 0 1 0-5',
repeat:'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
search:'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.3-4.3',
gear:'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
chart:'M3 3v18h18M7 16v-4M12 16V8M17 16v-7',
trash:'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
save:'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
folder:'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
upload:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
download:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
phone:'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01',
ban:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM4.9 4.9l14.2 14.2',
pin:'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
medal:'M7.2 2h9.6L14 9H10zM12 9a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM12 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z',
hammer:'M15 12l-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9M17.64 15 22 10.64M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91',
skull:'M12 2a8 8 0 0 0-8 8v4l2 2v5h12v-5l2-2v-4a8 8 0 0 0-8-8zM9 11.5h.01M15 11.5h.01M10 21v-3M14 21v-3',
tri:'M12 4 21 20H3Z',
mountain:'M8 3l4 8 5-5 5 15H2z',
waves:'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
pulse:'M22 12h-4l-3 9L9 3l-3 9H2',
stretch:'M12 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM4 8l8 1 8-1M12 9v5M8 21l4-7 4 7',
leg:'M10 2v9l-2 6v3h6v-2l-2-1 1-6 1-9',
foot:'M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0ZM20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6C14.6 6 14 7.8 14 9.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0ZM16 17h4M4 13h4',
wing:'M3 12c4-6 10-8 18-8-2 5-6 9-12 10M3 12l6 2M3 12c2 4 6 7 10 7',
hand:'M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
hang:'M3 3h18M8 3v5M16 3v5M12 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 13v5M9 22l3-4 3 4',
chev:'M12 19V5M5 12l7-7 7 7',
};
const M={'🏆':'trophy','🏋':'dumbbell','💪':'dumbbell','🦵':'leg','🏃':'run','🏅':'medal','🤸':'stretch','🧗':'mountain','🔥':'flame','🎯':'target','⚖':'scale','🚶':'walk','⚡':'zap','👟':'foot','✅':'checkc','⚠':'alert','✓':'check','✔':'check','📈':'up','🍽':'food','🔒':'lock','⚔':'swords','🚣':'waves','⏱':'timer','🚀':'rocket','🔬':'flask','✨':'sparkle','📉':'down','📡':'signal','🔄':'refresh','🙌':'hand','🪑':'chair','🦅':'wing','📏':'ruler','👩':'user','👨':'user','🧔':'user','👤':'user','🧑':'user','🎉':'party','💧':'drop','✕':'x','❌':'x','✖':'x','➕':'plus','⬆':'aup','⬇':'adown','⏸':'pause','✏':'pencil','📸':'camera','🌱':'sprout','🌿':'leaf','🥗':'leaf','🧬':'dna','📋':'clip','🦋':'wing','🕊':'wing','🔨':'hammer','💀':'skull','🍑':'pulse','🦶':'foot','🧘':'stretch','🐒':'hang','🔺':'tri','🏠':'home','🎲':'dice','💥':'zap','👑':'crown','🥩':'meat','🍔':'cookie','🍩':'cookie','📅':'cal','😴':'moon','🐢':'gauge','💊':'pill','☕':'coffee','🧠':'bulb','💡':'bulb','🤔':'bulb','🦴':'bone','🙂':'smile','👋':'smile','🐻':'heavy','🛋':'chair','💸':'cash','💻':'code','🎮':'game','📴':'offline','💬':'chat','🤖':'bot','📚':'book','🔁':'repeat','🔍':'search','👇':'adown','⚙':'gear','📊':'chart','🗑':'trash','💾':'save','📂':'folder','📁':'folder','📤':'upload','📥':'download','📱':'phone','🚫':'ban','📍':'pin','⭐':'sparkle','🌟':'sparkle'};
const SEQ={'🧑‍💻':'code'};
const ER=/(?<!\u2060)(?:\p{Extended_Pictographic}|[✓✕✔✖])(?:️|‍(?:\p{Extended_Pictographic})️?)*/gu;
const svg=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const name=m=>{const k=m.replace(/️/g,'');return SEQ[k]||M[[...k][0]]||'sparkle'};
window.ic=n=>svg(P[n]?n:'sparkle');
const KC=/(?<!\u2060)([0-9#*])\uFE0F?\u20E3/g;
const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','TITLE']);
function fix(root){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const hits=[];let t;
 while(t=w.nextNode()){ER.lastIndex=0;KC.lastIndex=0;if(ER.test(t.data)||KC.test(t.data))hits.push(t)}
 for(const n of hits){const p=n.parentNode;if(!p||SKIP.has(p.nodeName))continue;
  if(p.nodeName==='OPTION'){n.data=n.data.replace(ER,'').trim();continue}
  const tmp=document.createElement('span');tmp.innerHTML=n.data.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]).replace(KC,(m,d)=>`<span class="kc">${d}</span>`).replace(ER,m=>svg(name(m)));
  const f=document.createDocumentFragment();while(tmp.firstChild)f.appendChild(tmp.firstChild);p.replaceChild(f,n)}}
const st=document.createElement('style');st.textContent='.kc{display:inline-grid;place-items:center;min-width:1.15em;height:1.15em;font-size:.8em;font-weight:800;line-height:1;border:1.75px solid currentColor;border-radius:.3em;font-variant-numeric:tabular-nums}.ic{width:1em;height:1em;vertical-align:-.14em;display:inline-block;flex:none}';document.head.appendChild(st);
const go=()=>{fix(document.body);new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')fix(m.target.parentNode||document.body);else m.addedNodes.forEach(a=>a.nodeType===1?fix(a):a.nodeType===3&&a.parentNode&&fix(a.parentNode))}}).observe(document.body,{childList:true,subtree:true,characterData:true})};
document.body?go():document.addEventListener('DOMContentLoaded',go);
})();
