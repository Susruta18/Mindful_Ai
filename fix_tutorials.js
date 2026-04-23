const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

const newTutorials = `const GAME_TUTORIALS = {
  bubbles: {
    icon: '🫧', title: 'Zen Bubbles',
    desc: 'A gentle mindfulness game — pop rising bubbles to release stress and find calm.',
    steps: [
      { text: 'Click <strong>▶ Start</strong> to begin spawning bubbles.' },
      { text: 'Click or tap any bubble to <strong>pop it</strong> and earn a point.' },
      { text: 'Bubbles rise and fade — <strong>be quick</strong> but stay relaxed.' },
      { text: 'Try to breathe in rhythm with the rising bubbles.' }
    ],
    tip: '💡 <strong>Mindfulness tip:</strong> Each pop is a small release. Imagine your worries floating away with the bubbles.'
  },
  memory: {
    icon: '🧩', title: 'Memory Match',
    desc: 'A calming memory game that sharpens focus and quiets anxious thoughts.',
    steps: [
      { text: 'Click <strong>🔄 New Game</strong> to shuffle and deal the cards.' },
      { text: '<strong>Click a card</strong> to flip it and reveal the emoji.' },
      { text: 'Flip a second card — if they match, they <strong>stay revealed</strong>.' },
      { text: 'Match all pairs with the fewest moves to win!' }
    ],
    tip: '🧠 <strong>Why it helps:</strong> Memory tasks redirect anxious thoughts into focused, calm mental activity.'
  },
  doodle: {
    icon: '✨', title: 'Star Doodle',
    desc: 'A free-form drawing canvas — creative expression is deeply therapeutic.',
    steps: [
      { text: 'Choose a <strong>color</strong> and <strong>brush size</strong> from the toolbar.' },
      { text: 'Click and drag on the canvas to <strong>draw freely</strong>.' },
      { text: 'Use <strong>Undo</strong> to remove the last stroke anytime.' },
      { text: 'Click <strong>Clear</strong> to start a fresh canvas.' }
    ],
    tip: '🎨 <strong>Art therapy:</strong> Even 5 minutes of free drawing can significantly reduce cortisol levels.'
  },
  focus: {
    icon: '🎯', title: 'Focus Dots',
    desc: 'Train your reaction and focus by clicking disappearing dots before they vanish.',
    steps: [
      { text: 'Click <strong>▶ Start</strong> to begin the session.' },
      { text: 'Colored dots appear randomly — <strong>click them</strong> before they disappear.' },
      { text: 'Choose <strong>Slow / Medium / Fast</strong> speed to control difficulty.' },
      { text: 'Your score increases with each dot you catch in time.' }
    ],
    tip: '⏳ <strong>Focus training:</strong> Reaction games build concentration skills and interrupt rumination cycles.'
  },
  colorbreath: {
    icon: '🌈', title: 'Color Breathing',
    desc: 'A visual breathing companion — let the expanding orb guide your breath.',
    steps: [
      { text: 'Click <strong>▶ Start</strong> to begin the guided breathing session.' },
      { text: 'When the orb <strong>expands</strong> — breathe IN slowly.' },
      { text: 'When the orb <strong>shrinks</strong> — breathe OUT gently.' },
      { text: 'Choose a <strong>color palette</strong> below to match your mood.' }
    ],
    tip: '🫁 <strong>Science:</strong> Controlled breathing activates the parasympathetic nervous system, reducing anxiety in minutes.'
  }
};`;

content = content.replace(/const GAME_TUTORIALS\s*=\s*\{[\s\S]*?\n\};\n/g, newTutorials + '\n');
fs.writeFileSync('app.js', content, 'utf8');
console.log('Fixed GAME_TUTORIALS in app.js');
