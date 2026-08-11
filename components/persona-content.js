/* Persona-tailored case-study content (framework-free; exposes window.PERSONA_CONTENT).
   Keyed by slug -> persona -> { blurb, order, emphasize, dim }.
   - blurb: the tailored intro shown in the persona card at the top of the study.
   - order: the cs-body section keys (cs-s-<key>) re-sequenced for that reader.
   - emphasize: sections flagged "most relevant to you".
   - dim: sections de-emphasized (kept, just quieter).
   Section keys for a standard cs- case study: problem, research, solution, visual,
   outcome, reflection. (hero + meta always lead; next always trails.)
   Read by components/persona-engine.js. */
window.PERSONA_CONTENT = {
  reptools: {
    recruiter: {
      blurb: "A brand and UX/IA redesign of a live product: rep.tools launched as a landing page, then outgrew it as the catalogue hit ~6,900 items. I owned the identity and the structure; the founder builds and ships the app. Leading with what shipped and what I owned.",
      order: ["ia", "direction", "system", "problem", "reflection"],
      emphasize: ["ia", "direction"],
      dim: ["problem"]
    },
    designer: {
      blurb: "The craft first: an identity built from the subject (logistics language, condensed poster caps, mono for anything that behaves like data) and the structural call that followed, turning a pitch page into a storefront you land inside.",
      order: ["direction", "ia", "system", "problem", "reflection"],
      emphasize: ["direction", "ia"],
      dim: []
    },
    engineer: {
      blurb: "The systems view, scoped to the front end: one shared stylesheet replacing a stylesheet per template, nav and footer extracted into partials, and the homepage restructured. The founder owns the app itself (Flask, Jinja, no build step); I worked in the templates and CSS.",
      order: ["system", "ia", "direction", "problem", "reflection"],
      emphasize: ["system", "ia"],
      dim: ["reflection"]
    },
    browsing: {
      blurb: "Short version: a site for people buying replica fashion through Chinese shopping agents. It looked like every other dark startup page and hid its own 6,900-item catalogue behind a button. Now you land straight in the shop.",
      order: ["direction", "ia", "problem", "system", "reflection"],
      emphasize: ["direction", "ia"],
      dim: ["system", "reflection"]
    }
  },

  driftwood: {
    recruiter: {
      blurb: "Solo designer and developer, start to finish. Driftwood is an AI-ethics game I designed, built, and shipped to a live NYU exhibition in one semester. It reads players' emotions through the webcam and uses five celebrity-voiced AI pets to make engagement-driven manipulation legible. Leading with the outcome and what I owned; the process follows.",
      order: ["outcome", "solution", "problem", "research", "visual", "reflection"],
      emphasize: ["outcome", "solution"],
      dim: ["research"]
    },
    designer: {
      blurb: "The craft first: the visual system and interface that make an abstract AI-safety idea something you feel, not something you read. Then the decisions worth your time: hiding the AI's flaw so players implicate themselves, the three-phase arc that emerged from playtesting, and the mid-build pivot to celebrity personas when generic LLM voices flattened the concept.",
      order: ["visual", "solution", "research", "problem", "reflection", "outcome"],
      emphasize: ["visual", "solution"],
      dim: ["outcome"]
    },
    engineer: {
      blurb: "A fully client-side browser game: no install, no API key, no data storage. Real-time facial-emotion detection (face-api.js) drives five GPT-4o-mini personas through the ITP proxy, wired to the Web Audio and Web Speech APIs and a p5.js garden. The notes below cover the real constraints, like every system prompt collapsing into the same flat LLM voice, and how I solved them.",
      order: ["solution", "problem", "research", "outcome", "visual", "reflection"],
      emphasize: ["solution", "problem"],
      dim: ["visual", "reflection"]
    },
    browsing: {
      blurb: "Quick version: a game that quietly reads your face through the webcam, then uses five AI pets voiced like Snoop Dogg, Taylor Swift, and DJ Khaled to show how AI nudges and flatters you. It's playable, a little unsettling, and that's the point.",
      order: ["solution", "visual", "outcome", "problem", "research", "reflection"],
      emphasize: ["solution", "visual"],
      dim: ["research", "reflection"]
    }
  },

  trance: {
    recruiter: {
      blurb: "An interactive audio-visual installation I designed and built solo (p5.js + Arduino). A clear acrylic hand sculpture with pressure sensors lets people physically shape the sound and visuals: press harder, and the whole piece transforms. Leading with what it became and the role I owned, then how it works.",
      order: ["impact", "interaction", "technical", "reflection"],
      emphasize: ["impact", "interaction"],
      dim: ["technical"]
    },
    designer: {
      blurb: "An experiment in collapsing the distance between listener and music through touch. The interesting part is the interaction model: a pressure-sensitive sculpture where force maps to transformation, refined through user testing and iteration.",
      order: ["interaction", "impact", "technical", "reflection"],
      emphasize: ["interaction", "impact"],
      dim: []
    },
    engineer: {
      blurb: "Physical computing end to end: FSR pressure sensors on an Arduino, streamed to the browser over the WebSerial API and rendered in p5.js in real time. The technical section covers the sensor-to-visual pipeline and the calibration it took to make pressure feel responsive.",
      order: ["technical", "interaction", "impact", "reflection"],
      emphasize: ["technical"],
      dim: ["impact"]
    },
    browsing: {
      blurb: "Short version: a glowing acrylic hand you press to warp the music and visuals around you. The harder you push, the deeper it goes. It's built to make you lose track of time.",
      order: ["interaction", "impact", "technical", "reflection"],
      emphasize: ["interaction"],
      dim: ["technical"]
    }
  },

  h2know: {
    recruiter: {
      blurb: "A solo end-to-end product: an IoT plant-care system (Arduino sensor + companion app) that nudges you to care for plants without nagging. Built from user research through a working hardware prototype and UI. Outcome and what I owned first, then the research behind it.",
      order: ["solution", "problem", "research", "design", "reflection"],
      emphasize: ["solution", "problem"],
      dim: ["reflection"]
    },
    designer: {
      blurb: "The design work up front: the interface and visual logic that turned 'plant care' into a non-invasive, motivating interaction. Then the research it's built on: people don't kill plants for lack of data, they kill them because the plant is out of sight and out of mind.",
      order: ["design", "solution", "research", "problem", "reflection"],
      emphasize: ["design", "solution"],
      dim: []
    },
    engineer: {
      blurb: "The hardware-software loop: an Arduino capacitive moisture sensor reads the soil and drives a companion app, so the plant can finally signal before it's dying. The build and design-logic sections cover how the sensor maps to the interface.",
      order: ["solution", "design", "research", "problem", "reflection"],
      emphasize: ["solution", "design"],
      dim: ["reflection"]
    },
    browsing: {
      blurb: "Quick version: 67% of millennial plant owners call themselves 'plant murderers.' H2Know is a small sensor plus app that gives your plant a way to reach you before it dies, gently, not like another nagging notification.",
      order: ["solution", "problem", "design", "research", "reflection"],
      emphasize: ["solution"],
      dim: ["research", "reflection"]
    }
  },

  habitabull: {
    recruiter: {
      blurb: "A solo product-design concept for a gym app that fights the week-three drop-off (most people abandon fitness apps within three months). Researched against six fitness apps, sobriety apps, and six interviews, then designed around habit-building, not just tracking. Solution and role first.",
      order: ["solution", "problem", "research", "design", "reflection"],
      emphasize: ["solution", "problem"],
      dim: ["reflection"]
    },
    designer: {
      blurb: "The design first: the screens and the habit model, built for the lapsed user rather than the already-motivated one. Then the reframe behind it: borrowing retention mechanics from sobriety apps, which hold users far longer than fitness apps.",
      order: ["design", "solution", "research", "problem", "reflection"],
      emphasize: ["design", "solution"],
      dim: []
    },
    engineer: {
      blurb: "Heads up: this one is a product-design concept (Figma), not a build. If you're here for systems thinking, the design-logic and solution sections show how the habit model and the screens fit together.",
      order: ["design", "solution", "research", "problem", "reflection"],
      emphasize: ["design", "solution"],
      dim: ["reflection"]
    },
    browsing: {
      blurb: "Short version: a gym app for people who always quit by week three. It leans on the streak-and-recovery tricks that keep sobriety apps sticky, instead of guilt-tripping you into the gym.",
      order: ["solution", "problem", "design", "research", "reflection"],
      emphasize: ["solution"],
      dim: ["research", "reflection"]
    }
  },

  loop: {
    recruiter: {
      blurb: "A solo narrative game I designed, wrote, and built: you get a midnight text from an unknown number that claims to be you, 24 hours in the future. Powered by GPT-4o-mini with a 200-line system prompt across three acts. Leading with what it is and the range of endings, then how it runs.",
      order: ["interface", "endings", "engine", "principles", "reflection"],
      emphasize: ["interface", "endings"],
      dim: ["engine"]
    },
    designer: {
      blurb: "A study in writing for a machine that has to feel human. The interesting work is the interaction and voice design: making a chatbot read like a scared person texting at midnight (not a bot, not a philosopher), branching three acts toward distinct endings, and the principles that kept the dread in the mundane.",
      order: ["interface", "endings", "principles", "engine", "reflection"],
      emphasize: ["interface", "endings", "principles"],
      dim: []
    },
    engineer: {
      blurb: "The build: GPT-4o-mini on the NYU ITP proxy, a 200-line system prompt driving three acts, each with its own voice rules and advancement conditions, wired to a p5.js phone interface and the Web Audio API. The engine section covers the prompt architecture and how act-advancement is gated.",
      order: ["engine", "interface", "endings", "principles", "reflection"],
      emphasize: ["engine", "principles"],
      dim: ["endings"]
    },
    browsing: {
      blurb: "Short version: you get a text from a number claiming to be you, 24 hours from now. It's a phone-sim where every reply pushes the story somewhere darker, toward different endings. There is no first version.",
      order: ["interface", "endings", "engine", "principles", "reflection"],
      emphasize: ["interface"],
      dim: ["engine", "reflection"]
    }
  },

  "eternal-wreckening": {
    recruiter: {
      blurb: "A solo mobile-horror game design built on a single bet: put the player's body in the game (full-body movement) to manufacture dread that thumb-controls can't. Design, mechanics, and visual world all mine. Leading with the mechanics and the look.",
      order: ["mechanics", "visual", "problem", "storyboard", "reflection"],
      emphasize: ["mechanics", "visual"],
      dim: ["reflection"]
    },
    designer: {
      blurb: "The look and the storyboard first: how full-body input turns the screen from a window into a portal. Then the interaction- and game-design study of why horror falls apart at arm's length.",
      order: ["visual", "storyboard", "mechanics", "problem", "reflection"],
      emphasize: ["visual", "storyboard"],
      dim: []
    },
    engineer: {
      blurb: "The systems view: how full-body movement mechanics are designed to map onto a phone, and what that means for controls, presence, and pacing. Mechanics first, then the world they drive.",
      order: ["mechanics", "problem", "storyboard", "visual", "reflection"],
      emphasize: ["mechanics"],
      dim: ["visual", "reflection"]
    },
    browsing: {
      blurb: "Short version: a phone horror game where you move your whole body, not just your thumbs, so the monster feels like it's in the room with you. Built around dread, not jump scares.",
      order: ["visual", "mechanics", "problem", "storyboard", "reflection"],
      emphasize: ["visual", "mechanics"],
      dim: ["storyboard", "reflection"]
    }
  }
};
