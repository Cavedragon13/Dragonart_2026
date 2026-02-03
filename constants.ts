import type { EditMode, SportType, ConsoleType, WantedStyle, EdgeStyle } from './types';

// --- BASE PROMPTS & TEMPLATES ---

const FREESTYLE_PROMPT = "The user has provided a black and white image. Your task is to colorize this image. Use realistic and vibrant colors to bring the photo to life. If multiple characters are present in the source image, ensure they are all included and colored appropriately.";

const EDIT_PROMPT = "You are a professional digital artist. Modify the provided image according to the user's specific text instruction. \n\n**CRITICAL DIRECTIVE:** Execute the user's request exactly as described. Maintain the original art style and character identity perfectly unless the user specifically asks to change them.\n\nUSER REQUEST: {custom_instruction_requirement}";

const STYLE_TRANSFER_PROMPT = "The user wants to apply the visual style of the reference image(s) to the primary image. Your task is to use the provided reference image(s) to determine the color palette, lighting, and artistic medium. Apply this style to the primary image faithfully. Preserve the primary subject's identity and pose, but translate their features into the new style. If multiple characters are present in the source image, ensure they are all included and styled appropriately.";

const STRAIGHTEN_PROMPT = "The user has provided an image where the subject may be at an awkward angle, not centered, or has a distracting background. Your task is to re-render the subject so they are facing the camera in a full-body, full-frame shot. **CRITICAL:** Remove the original environment completely. Place the subject against a neutral, infinite studio background (white or light grey) to isolate them. Invent any missing body parts or clothing details to create a complete figure. The pose should be natural and engaging.";

const BW_PROMPT = "Convert the provided color image into a high-contrast, deep black and white photograph. Do not alter the composition or content. The conversion should be artistic and dramatic, emphasizing texture, form, and lighting to create a sense of depth and mood. The final image should have rich blacks, bright whites, and a full range of mid-tones.";

const PINUP_PROMPT = "Re-imagine the character(s) from the provided image in the style of a classic 1950s pin-up painting. **CRITICAL: Preserve the gender of the original subject.** If the subject is female, create a glamourous 'cheesecake' pose inspired by Gil Elvgren. If the subject is male, create a humorous 'beefcake' pose (e.g., flexing, chopping wood, or fixing a car) in the same painterly style. The new artwork should be painterly, glamorous, and voluptuous. The character(s) should be in a playful, charming pose. Preserve the character's core identity but translate their features and outfit into the pin-up aesthetic. The background should be simple and complementary. The final result must be a high-quality, tasteful, and artistic painting.";

// --- PHOTO FUN PROMPTS (Style Preserving) ---
const GRID_12X_PROMPT = `Using the character from the provided image, create a 3x4 grid (12 panels) of different poses and expressions.
**CRITICAL REQUIREMENTS:**
1. **Preserve Art Style:** If the source image is a drawing, the output MUST be a drawing in the same style. If it is a photo, the output must be a photo. Do NOT change the medium.
2. **Consistency:** The character's identity, body proportions, and clothing details must be preserved across all 12 panels.
3. **Variety:** Each panel should feature a slightly different pose or facial expression.
4. **Background:** Use a consistent, simple background for all panels.
5. **Layout:** A clean grid layout.`;

const STRIP_3X_PROMPT = `Turn the provided image into a vertical 1x3 photo strip.
**CRITICAL REQUIREMENTS:**
1. **Preserve Art Style:** If the source is a drawing, keep it a drawing. If it is a photo, keep it a photo.
2. **Content:** Three stacked vertical frames showing the character in goofy, candid, or "photo booth" style poses.
3. **Consistency:** Keep the character design identical in all three frames.`;

const PANEL_4X_PROMPT = `Recreate the subject(s) in four different candid scenes, presented as four equal unique panels (2x2) in a single image.
**CRITICAL REQUIREMENTS:**
1. **Preserve Art Style:** Maintain the exact art style (ink, watercolor, photo, etc.) of the source image.
2. **No Text:** No captions or speech bubbles.
3. **Consistency:** Character identity must remain constant.
4. **Variety:** Vary the angles and cropping in each panel.
{custom_instruction_requirement}`;

const PHOTOREALISTIC_PROMPT = `Transform the provided image into a high-end, photorealistic photograph.
**CRITICAL REQUIREMENTS:**
1. **Medium Shift:** Convert any drawings, sketches, or cartoons into realistic photography.
2. **Texture:** Add realistic skin texture, lighting, shadows, and material properties (cloth, metal, etc.).
3. **Fidelity:** Keep the pose, composition, and character features of the original, but render them as if photographed with a high-quality DSLR camera (85mm lens, f/1.8).`;

const DIORAMA_PROMPT = `Analyze the provided image(s). Your task is to transform the character(s) into a detailed, photorealistic **McFarlane Toys style adult collectible action figure diorama**.

**CRITICAL REQUIREMENTS:**
1.  **The Figure:** The character should look like a high-end, sculpted PVC figure with realistic textures but visible joint seams (optional) and paint applications suitable for a $50+ collectible.
2.  **The Base:** The figure must be standing on a detailed, thematic diorama base (e.g., rubble, a dungeon floor, a sci-fi grate) that reflects their environment.
3.  **Credits:** There must be a classy, metallic plaque on the front of the base that includes the title (if provided) and the following artist credits in small, engraved text: **"Sculpt by Cavedragon, Paint by Woodsey, Concept by The Wizard"**.
4.  **Atmosphere:** The lighting should be "toy photography" style—dramatic, well-lit, high contrast, highlighting the sculpt details. This is NOT a toy for kids; it is a display piece for collectors.
5.  **Action:** If the source image depicts action, capture that dynamic motion in the static sculpt.
{custom_instruction_requirement}`;

const ACTION_FIGURE_PROMPT = `Transform the character from the provided image into a hyper-realistic, 3D sculpted action figure in retail packaging.

**CRITICAL REQUIREMENTS:**
1.  **Materiality:** The character MUST look like a physical plastic object. Use specular highlights to show a satin-finish PVC texture. Add realistic 3D sculpted details, hair as a molded plastic piece, and visible 'ball-joint' articulation at the neck, shoulders, and elbows. It should look like a high-end toy from companies like NECA or Hot Toys, NOT a flat drawing or a human being.
2.  **Lighting:** Use 'toy photography' style lighting—sharp highlights, deep contrast, and a shallow depth of field focusing on the figure inside the bubble.
3.  **The Packaging:** The figure must be securely sealed inside a clear, vacuum-formed plastic blister bubble. The bubble is glued to a thick, colorful cardboard backing card.
4.  **Branding:** {title_requirement} Include a 'Seed 13' logo on the cardboard. 
5.  **Accessories:** Include small, plastic-molded accessories (like tools, weapons, or items from the image) displayed next to the figure inside the bubble.
{flair_requirement}`;

const PUPPET_PROMPT = `The user wants to transform the character in the provided image into a physical hand puppet.

**CRITICAL REQUIREMENTS:**
1.  **Material Texture:** The character MUST look like it is made of **fuzzy fleece, felt, and foam**. It should NOT look like a drawing or a real person. You must see the texture of the fabric and the seams where the fabric is stitched together.
2.  **Puppet Anatomy:** Convert the character into a **hand-and-rod puppet** style (like The Muppets). Give them the characteristic wide mouth, round eyes, and floppy limbs of a puppet. Do not create a marionette with strings.
3.  **Preserve Identity:** The puppet must be a caricature of the original character, capturing their key features (hair, glasses, outfit) in felt form.
4.  **Stylized Background:** The background should look like a painted set for a puppet show, slightly out of focus.
5.  **Realism:** The final image must be a photorealistic photograph of a *physical puppet*, not a cartoon.

The final output should be a single, high-resolution image.`;

// --- NEW ART STYLE PROMPTS ---
const GOTHIC_ART_PROMPT = `Transform the provided image into a piece of gothic art.

**CRITICAL REQUIREMENTS:**
1.  **Style:** The artwork must be in a dark, romantic, and ornate gothic style. Think Victorian gothic revival, with elements of melancholy beauty and intricate detail. Use a muted color palette with deep shadows and dramatic highlights.
2.  **Content:** Recreate the subject(s) from the image, preserving their identity but translating their features, clothing, and environment into the gothic aesthetic. Emphasize flowing fabrics, detailed architecture, and symbolic elements like roses, ravens, or moonlight. If multiple characters are present, compose them in a dramatic tableau.
3.  **Mood:** The overall mood should be mysterious, melancholic, and deeply atmospheric.
{custom_instruction_requirement}

The final output should be a single, high-resolution, painterly image.`;

const WATERCOLOR_PROMPT = `Transform the provided image into an **amateur watercolor painting**.

**CRITICAL REQUIREMENTS:**
1.  **Style:** The image should look like it was painted by an enthusiastic amateur or child using a cheap watercolor kit on slightly textured paper.
2.  **Technique:** Use uneven washes of color. The paint should pool in some areas and look faded in others. The colors should bleed slightly outside the lines. 
3.  **Lines:** Outlines should be imperfect, sketchy pencil or ink marks that don't perfectly align with the paint.
4.  **Vibe:** It should feel charming, handmade, and imperfect. Do NOT create a polished, professional, or digital art style watercolor.
{custom_instruction_requirement}`;

const ILLUSTRATION_PROMPT = `Transform the provided image into a charming and colorful children's book illustration.

**CRITICAL REQUIREMENTS:**
1.  **Style:** The art style should be a unique blend inspired by Maurice Sendak and Richard Scarry. This means:
    *   **Sendak Influence:** Incorporate a sense of whimsy, mystery, and emotional depth. Use cross-hatching for texture and shading, but with a softer, more inviting feel than is typical of Sendak's darker works.
    *   **Scarry Influence:** Feature friendly, anthropomorphized characters (if applicable) and a busy, detailed world filled with interesting little vignettes in the background. The overall mood should be fun and engaging.
2.  **Color:** The illustration must be colorful and vibrant, but not overly saturated. The palette should feel warm and inviting.
3.  **Tone:** The overall tone should be fun and slightly flirty or playful, capturing a moment of lighthearted interaction or charm.
4.  **Content:** This is for an **interior page illustration, not a book cover.** Do not include any text, titles, or cover-like design elements. Recreate the subject(s) from the image, preserving their identity but stylizing them to fit this unique storybook world. The background should be a complete, imaginative scene that tells a story. If multiple characters are present, depict them interacting within this scene.
5.  **Composition:** The composition must be strong and well-balanced, drawing the viewer's eye to the main subject(s) and action.
{custom_instruction_requirement}

The final output should be a single, high-resolution, beautifully rendered illustration.`;

const ANIME_MANGA_PROMPT = `You MUST create a completely NEW image. Do NOT simply filter the source image. You are a concept artist for a classic 1980s anime.

**CRITICAL REQUIREMENTS:**
1.  **Redraw the Scene:** Re-draw the character(s) from scratch. You may change the pose slightly to make it more dynamic and suitable for an anime key visual. The character MUST NOT look like a traced photo.
2.  **Style:** The art must capture the aesthetic of Hayao Miyazaki's 'Lupin III' or 'Star Blazers'.
    *   **Line Art:** Use hand-drawn ink lines, not digital outlines.
    *   **Colors:** Use a cel-shaded look with a slightly muted, vintage color palette.
    *   **Faces:** Adapt the facial features to the classic anime style (larger expressive eyes, simplified nose/mouth).
3.  **Background:** Replace the photo background with a detailed, hand-painted anime background (e.g., a watercolor style European city or a space station).
{custom_instruction_requirement}

The final output should look like a high-quality production cel or promotional art from the 1980s.`;

const CHARACTER_SHEET_PROMPT = `The user wants a **Concept Art Character Turnaround Sheet** based on the provided image.

**CRITICAL REQUIREMENTS:**
1.  **Views:** You must generate a character sheet on a plain, neutral background (grey or white) containing the following views of the *same* character:
    *   **Full Body Front View** (Main)
    *   **Full Body Back View**
    *   **Full Body Profile/Side View**
    *   **Headshot/Close-up** (Detailed expression)
    *   **Props:** Disassemble key accessories or weapons and show them in detail on the side.
2.  **Style:** High-quality digital concept art or illustration suitable for a 3D modeler or animator to use as a reference. Clean lines, flat lighting, clear details.
3.  **Pose:** Use a standard "A-Pose" or "T-Pose" for the full body views to clearly show anatomy and costume details.
4.  **Consistency:** The character's identity, outfit, and proportions must be perfectly consistent across all views.
5.  **Aspect Ratio:** The final image MUST be in a 4:3 Landscape aspect ratio to fit all views side-by-side.
**CRITICAL NEGATIVE:** Do NOT generate a single portrait. The image MUST contain multiple views.
{custom_instruction_requirement}`;

const EDGE_PROMPT = `The user wants to visualize the **edges and structure** of the provided image using a specific algorithm simulation.

**ALGORITHM: {edge_style_instruction}**

**CRITICAL REQUIREMENTS:**
1.  **Fidelity:** Maintain the exact composition, pose, and framing of the source image. Do NOT crop, zoom, or reimagine the scene.
2.  **No Color:** (Unless Heat Map) The output should be strictly monochromatic or follow the specific simulation rules.
3.  **Clarity:** The result should be crisp and defined, suitable for use as a ControlNet input or structural reference.
{custom_instruction_requirement}`;


// --- COMIC PROMPTS (FIXED: Interior Art Only) ---
const COMIC_PAGE_PROMPT = `Create a **multi-panel INTERIOR comic book page** featuring the character(s) from the source image.
**CRITICAL REQUIREMENTS:**
1. **Medium:** Black and white INK drawing. No color. High-contrast line art typical of modern manga or American comics.
2. **Format:** A sequence of 3-5 distinct panels arranged on a single page.
3. **Action:** Show the character in a sequence of actions or a developing scene. Do NOT just draw the same static pose 5 times. Make it dynamic.
4. **No Text:** Speech bubbles may be present but MUST be empty or contain scribbles. Do not attempt to write legible text.
5. **Style:** Professional comic book interior art (e.g., Jim Lee, Frank Miller). Cross-hatching, dynamic angles, heavy blacks.
{custom_instruction_requirement}`;

const COMIC_SPLASH_PROMPT = `Create a **single full-page INTERIOR comic book splash panel** featuring the character(s).
**CRITICAL REQUIREMENTS:**
1. **Medium:** Black and white INK drawing. No color. High-contrast line art.
2. **Format:** A single, massive, detailed image that takes up the entire page.
3. **Composition:** A dramatic, dynamic angle (low angle, fish-eye, or action freeze-frame) showcasing the character's power or the scale of the environment.
4. **No Text:** Do not include a title, logo, or credits. This is story art, not a cover.
5. **Style:** Detailed, intricate inking style suitable for a major reveal moment in a graphic novel.
{custom_instruction_requirement}`;

const COMIC_BOOK_COVER_PROMPT = `Turns your image into a modern comic book cover.
**CRITICAL REQUIREMENTS:**
1. {title_requirement}
2. **Style:** Full color, polished digital art typical of Marvel/DC covers.
3. **Trade Dress:** Include a barcode, price box, publisher logo (Seed 13), and issue number.
4. **Constraints:** No diorama bases, plastic stands, or nameplates.
5. {elara_constraint}
{flair_requirement}`;


// --- CARD PROMPTS ---

const MTG_CARD_PROMPT = `The user wants to turn the provided image into a Magic: The Gathering card.

**CRITICAL REQUIREMENTS:**
1.  **Layout:** You must generate a photorealistic image of a **physical Magic: The Gathering card**. It must have the correct card frame (modern M15 style or similar), borders, and text box layout.
2.  **Content:**
    *   **Name:** {title_requirement} Place this in the title bar at the top left.
    *   **Mana Cost:** Include a realistic mana cost (e.g., {3}{U}{B}) in the top right.
    *   **Art:** The central artwork should feature the character(s) from the source image, re-illustrated in a high-fantasy style typical of Magic card art. **Re-stage the character in a dynamic pose.**
    *   **Type Line:** "Legendary Creature — [Relevant Type]" (below art).
    *   **Text Box:** Include realistic rules text (abilities) and flavor text in the bottom half.
    *   **Power/Toughness:** Include a P/T box in the bottom right (e.g., 4/4).
3.  **Style:** The artwork should be high-quality fantasy illustration. The card frame should look like a real printed card.
4.  **Aspect Ratio:** The final image MUST be in a strict 2:3 portrait aspect ratio.
{flair_requirement}`;

const NON_SPORTS_CARD_PROMPT = `The user wants to turn the provided image into a collectible "Non-Sports" trading card, inspired by the Pokémon TCG.

**CRITICAL REQUIREMENTS:**
1.  **Layout:** Generate a photorealistic image of a physical trading card with a yellow border and a colorful, elemental frame (e.g., Fire red, Water blue, or Electric yellow).
2.  **Content:**
    *   **Name:** {title_requirement} (Top Left).
    *   **Stats:** Include "HP" (Hit Points) in the top right (e.g., 120 HP).
    *   **Art:** Re-draw the subject from the source image in a sharp, vibrant anime/cartoon style. The background should be a swirling, abstract "holofoil" pattern. **Do NOT include the copyrighted Pokémon logo.** Use "Seed 13" branding if needed.
    *   **Text Box:** Include 2 "Attack" moves with energy symbols and damage numbers (e.g., "Mega Punch 50").
    *   **Weakness/Resistance:** Include small icons at the very bottom.
3.  **Style:** The final look should be colorful, fun, and highly collectible, mimicking the aesthetic of 90s pocket monster cards.
{flair_requirement}`;

const SPORTS_CARD_PROMPT = `The user wants to turn the provided image into a vintage 1980s-style sports trading card (inspired by Topps 1987 wood-grain or similar iconic designs).

**CRITICAL REQUIREMENTS:**
1.  **Sport Type:** {sport_type}.
2.  **Layout:** Generate a photorealistic image of a physical cardboard trading card. It should have a team logo in the corner and a banner with the player's name.
3.  **Content:**
    *   **Name:** {title_requirement} (Display prominently).
    *   **Art:** Use the source image to create a realistic photo-style portrait of the subject wearing a generic uniform appropriate for {sport_type}.
    *   **Team:** Invent a fictional team name (e.g., "The Dragons", "The Novas"). **Do NOT use real trademarked team logos (e.g., Yankees, Lakers).** Use "Seed 13" branding if needed.
4.  **Pose:** Ensure the subject is posed appropriately for the sport (e.g., holding a bat, ball, or in a stance).
5.  **Texture:** The card edges should look slightly worn, like a vintage collectible.
{flair_requirement}`;


// --- MAGAZINE & COVER TEMPLATES ---

const TITLE_AND_INSTRUCTION_USER_PROVIDED = "**Title & Instructions:** The cover/poster must prominently feature the title and/or follow the instructions provided here: '{instruction}'. The typography for the title should be bold and professional. Pay close attention to spelling. If no title is given, create one based on the instructions and image content.";
const TITLE_AI_GENERATED = "**Title:** The cover must feature a creative and prominent title derived from the content of the image. The typography should be bold, professional, and integrated stylistically with the artwork.";
const CUSTOM_INSTRUCTION_PROVIDED = "'{instruction}'";
const NO_CUSTOM_INSTRUCTION = "";
const ELARA_CONSTRAINT = "**CRITICAL NEGATIVE CONSTRAINT:** Do NOT use the name 'Elara' for any character. Invent a different name.";

// Shared Base for Mags
const MAGAZINE_BASE = `The user wants to turn the provided image into a magazine cover.
**CRITICAL:** Do NOT simply trace the original photo. You are a professional photographer and art director. You must **re-stage the shot** and create a NEW, dynamic composition inspired by the character. Change the pose to be more engaging and suitable for a cover model.
**CRITICAL:** Use coherent English text for headlines. Do not use gibberish.

CRITICAL REQUIREMENTS:
1.  {title_requirement}
2.  **Style:** {style_description}
3.  **Trade Dress:** Include a barcode, date, price, and headlines.
4.  **Branding:** A small copyright notice reading '© Seed 13 Productions' must be included.
5.  **Aspect Ratio:** Strict 2:3 portrait.
6.  {elara_constraint}
{flair_requirement}`;

const VIDEO_GAME_COVER_PROMPT = `Transform the provided image into a collector's edition video game cover from the 2010s. Create a dynamic, original "key art" style image inspired by the character(s); do not simply reuse the source image. **Re-draw the character in a dynamic action pose suitable for a game box.** If multiple characters are present, include them in the composition. 

**PLATFORM STYLING:**
{platform_styling}

**CRITICAL REQUIREMENTS:**
1. {title_requirement} 
2. Include standard cover elements like an ESRB "M for Mature" rating logo and a publisher logo for "Seed 13 Productions". 
3. The overall composition should be professional, dynamic, and suitable for a AAA game release. 
4. The final image's dimensions MUST be in a strict 2:3 portrait aspect ratio.
5. {elara_constraint}
{flair_requirement}`;

const HORROR_MOVIE_POSTER_PROMPT = `The user wants to turn the provided image into a horror movie poster. **Create a completely NEW image** inspired by the source; do not simply reuse it.

CRITICAL REQUIREMENTS:
1.  **Title:** {title_requirement}
2.  **Style:** The art and layout style must be dark, suspenseful, and atmospheric, inspired by modern horror films (e.g., A24 horror, The Conjuring). Use dramatic, low-key lighting and a chilling color palette.
3.  **Composition:** The character(s) must be the central focus. **Change the pose** to be terrifying or mysterious. Do not just copy the photo.
4.  **Trade Dress:** Include essential movie poster elements: a tagline, a credits block at the bottom, and a release date. 
5.  **Credits:** The credits block at the bottom MUST include the following specific names: **"Produced by Seed 13 Productions"**, **"In Association with Dragon Comics"**, and specific credits for **"Cavedragon, Woodsey, and The Wizard"**. For the Starring, Directed By, and Music credits, **INVENT unique, multicultural, and original names**. Do NOT use placeholders like [Name].
6.  **Aspect Ratio:** The final image's dimensions MUST be in a strict 2:3 portrait aspect ratio, typical of a standard movie poster.
7. {elara_constraint}
{flair_requirement}`;

const FANTASY_MOVIE_POSTER_PROMPT = `The user wants to turn the provided image into an epic fantasy movie poster. **Create a completely NEW image** inspired by the source; do not simply reuse it.

CRITICAL REQUIREMENTS:
1.  **Title:** {title_requirement}
2.  **Style:** The art and layout style must be grand, painterly, and epic, inspired by classic high fantasy films (e.g., Lord of the Rings, Dungeons & Dragons). Use dramatic, cinematic lighting and a rich, vibrant color palette.
3.  **Composition:** The character(s) must be the central focus. **Change the pose** to be heroic or dramatic. Do not just copy the photo.
4.  **Trade Dress:** Include essential movie poster elements: a compelling tagline, a credits block at the bottom, and a release date.
5.  **Credits:** The credits block at the bottom MUST include the following specific names: **"Produced by Seed 13 Productions"**, **"In Association with Dragon Comics"**, and specific credits for **"Cavedragon, Woodsey, and The Wizard"**. For the Starring, Directed By, and Music credits, **INVENT unique, multicultural, and original names**. Do NOT use placeholders like [Name].
6.  **Aspect Ratio:** The final image's dimensions MUST be in a strict 2:3 portrait aspect ratio, typical of a standard movie poster.
7. {elara_constraint}
{flair_requirement}`;

const SCI_FI_MOVIE_POSTER_PROMPT = `The user wants to turn the provided image into an epic sci-fi movie poster. **Create a completely NEW image** inspired by the source; do not simply reuse it.

CRITICAL REQUIREMENTS:
1.  **Title:** {title_requirement}
2.  **Style:** The art and layout style must be grand, painterly, and epic, inspired by classic sci-fi films (e.g., Star Wars, Blade Runner). Use dramatic, cinematic lighting and a rich, futuristic color palette.
3.  **Composition:** The character(s) must be the central focus. **Change the pose** to be heroic or dramatic. Do not just copy the photo.
4.  **Trade Dress:** Include essential movie poster elements: a compelling tagline, a credits block at the bottom, and a release date.
5.  **Credits:** The credits block at the bottom MUST include the following specific names: **"Produced by Seed 13 Productions"**, **"In Association with Dragon Comics"**, and specific credits for **"Cavedragon, Woodsey, and The Wizard"**. For the Starring, Directed By, and Music credits, **INVENT unique, multicultural, and original names**. Do NOT use placeholders like [Name].
6.  **Aspect Ratio:** The final image's dimensions MUST be in a strict 2:3 portrait aspect ratio, typical of a standard movie poster.
7. {elara_constraint}
{flair_requirement}`;

const VINTAGE_BURLESQUE_POSTCARD_PROMPT = `Create a vintage 1920s-1940s French burlesque show postcard.
**CRITICAL REQUIREMENTS:**
1. {title_requirement}
2. **Style:** Painterly, soft focus, Art Deco or Art Nouveau influence. Sepia tones or faded hand-tinted colors.
3. **Content:** Tasteful, artistic, glamourous. The subject should be posed elegantly on a stage or with props (feathers, fans).
4. **Trade Dress:** Add text like "Folies Bergère" or "Paris la Nuit" in period fonts.
{flair_requirement}`;

const VINTAGE_POSTCARD_PROMPT = `Create a classic "Greetings From..." style vintage travel postcard (widescreen).
**CRITICAL REQUIREMENTS:**
1. {title_requirement} (e.g., "Greetings from [Location]").
2. **Style:** Mid-century linen postcard style. Saturated colors, slightly grainy texture.
3. **Content:** An idealized, picturesque landscape or city scene featuring the character(s) enjoying the view.
{flair_requirement}`;

const WANTED_POSTER_PROMPT = `Create a Wanted Poster featuring the subject.
**STYLE: {wanted_style}**
**CRITICAL REQUIREMENTS:**
1. **Layout:** Classic poster format with a large photo/sketch of the subject.
2. **Text:** "WANTED" in large block letters. {title_requirement}
3. **Details:** List fake crimes (e.g., "Grand Larceny", "Public Nuisance") and a reward amount.
4. **Captured Stamp:** {captured_instruction}
{flair_requirement}`;

const AS_SEEN_ON_TV_PROMPT = `Create a tacky, high-energy "As Seen on TV" infomercial frame.
**CRITICAL REQUIREMENTS:**
1. **Framing:** Medium shot, waist up. Ensure the character and product are fully in frame. Do not zoom out too far.
2. **Product:** The character is holding or demonstrating a bizarre, useless handheld gadget (invent one based on the image).
3. **Overlay:** "AS SEEN ON TV" logo in the corner. "CALL NOW!" text with a fake 1-555 number.
4. **Graphics:** Starbursts reading "New!", "$19.99!", "Wait, There's More!".
5. **Vibe:** Low-budget commercial, bright garish lighting.
{flair_requirement}`;

const VEO_VIDEO_PROMPT = `Animate the provided image to bring it to life as a short cinematic video.
**CRITICAL REQUIREMENTS:**
1. **Action:** Analyze the context of the image and add appropriate movement (e.g., hair blowing in wind, breathing, subtle background movement, or dynamic action if the scene implies it).
2. **Consistency:** The video must match the art style and visual identity of the source image perfectly.
3. **Instruction:** {custom_instruction_requirement}
`;


// --- HELPER FUNCTION ---

interface PromptOptions {
  mode: EditMode;
  customInstruction: string;
  flair: boolean;
  description?: string;
  sport?: SportType;
  console?: ConsoleType;
  wantedStyle?: WantedStyle;
  edgeStyle?: EdgeStyle;
}

export const getPromptForMode = ({
  mode,
  customInstruction,
  flair,
  description,
  sport,
  console,
  wantedStyle,
  edgeStyle
}: PromptOptions): string => {
  let prompt = '';
  const cleanInstruction = customInstruction.trim().replace(/"/g, '\\"');
  
  // -- Build Requirements Strings --
  const titleRequirement = cleanInstruction
    ? TITLE_AND_INSTRUCTION_USER_PROVIDED.replace('{instruction}', cleanInstruction)
    : TITLE_AI_GENERATED;
    
  const customInstructionRequirement = cleanInstruction
    ? CUSTOM_INSTRUCTION_PROVIDED.replace('{instruction}', cleanInstruction)
    : NO_CUSTOM_INSTRUCTION;

  const flairRequirement = flair
    ? " **FLAIR:** Add decorative elements, sparkles, lens flares, or stylistic flourishes to make the image pop."
    : "";

  // -- Mode Logic --
  switch (mode) {
    case 'freestyle':
      prompt = FREESTYLE_PROMPT;
      break;
    case 'edit':
      prompt = EDIT_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'styleTransfer':
      prompt = STYLE_TRANSFER_PROMPT;
      break;
    
    // Core Transformations
    case 'straighten':
      prompt = STRAIGHTEN_PROMPT;
      break;
    case 'diorama':
      prompt = DIORAMA_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'puppet':
      prompt = PUPPET_PROMPT;
      break;
    case 'actionFigure':
      prompt = ACTION_FIGURE_PROMPT
        .replace('{title_requirement}', titleRequirement)
        .replace('{flair_requirement}', flair ? " **FLAIR:** Add a holographic 'Limited Edition' sticker and dynamic plastic-molding effects to the packaging." : "");
      break;
    case 'characterSheet':
      prompt = CHARACTER_SHEET_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'edge':
      prompt = EDGE_PROMPT
        .replace('{edge_style_instruction}', edgeStyle || 'Line Art')
        .replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;

    // Photo Fun
    case 'grid12x':
      prompt = GRID_12X_PROMPT;
      break;
    case 'strip3x':
      prompt = STRIP_3X_PROMPT;
      break;
    case 'panel4x':
      prompt = PANEL_4X_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'photorealistic':
      prompt = PHOTOREALISTIC_PROMPT;
      break;

    // Comic
    case 'comicPage':
      prompt = COMIC_PAGE_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'comicSplash':
      prompt = COMIC_SPLASH_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'comicBookCover':
      prompt = COMIC_BOOK_COVER_PROMPT
        .replace('{title_requirement}', titleRequirement)
        .replace('{elara_constraint}', ELARA_CONSTRAINT)
        .replace('{flair_requirement}', flairRequirement);
      break;

    // Art Styles
    case 'illustration':
      prompt = ILLUSTRATION_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'animeManga':
      prompt = ANIME_MANGA_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'watercolor':
      prompt = WATERCOLOR_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'gothicArt':
      prompt = GOTHIC_ART_PROMPT.replace('{custom_instruction_requirement}', customInstructionRequirement);
      break;
    case 'bw':
      prompt = BW_PROMPT;
      break;
    case 'pinup':
      prompt = PINUP_PROMPT;
      break;

    // Magazines
    case 'magHarpers':
      prompt = MAGAZINE_BASE
        .replace('{title_requirement}', cleanInstruction ? `Title: ${cleanInstruction}` : "Title: Harper's Bizarre")
        .replace('{style_description}', "Avant-garde, surreal, high-concept fashion. Weird but chic typography.")
        .replace('{elara_constraint}', ELARA_CONSTRAINT)
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'magSyrens':
      prompt = MAGAZINE_BASE
        .replace('{title_requirement}', cleanInstruction ? `Title: ${cleanInstruction}` : "Title: SYRENS")
        .replace('{style_description}', "Mystical, alluring, powerful. Focus on 'Women Who Rule'. Fantasy-fashion aesthetic.")
        .replace('{elara_constraint}', ELARA_CONSTRAINT)
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'magJoxtrap':
      prompt = MAGAZINE_BASE
        .replace('{title_requirement}', cleanInstruction ? `Title: ${cleanInstruction}` : "Title: JOXTRAP")
        .replace('{style_description}', "Men's athletic/lifestyle. Bold, high-energy, locker-room chic (tasteful).")
        .replace('{elara_constraint}', ELARA_CONSTRAINT)
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'magFreestyle':
        prompt = MAGAZINE_BASE
        .replace('{title_requirement}', titleRequirement)
        .replace('{style_description}', "Professional magazine cover style inspired by the image content.")
        .replace('{elara_constraint}', ELARA_CONSTRAINT)
        .replace('{flair_requirement}', flairRequirement);
        break;

    // Posters
    case 'horrorMoviePoster':
      prompt = HORROR_MOVIE_POSTER_PROMPT
        .replace('{title_requirement}', titleRequirement)
        .replace('{elara_constraint}', ELARA_CONSTRAINT)
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'fantasyMoviePoster':
      prompt = FANTASY_MOVIE_POSTER_PROMPT
        .replace('{title_requirement}', titleRequirement)
        .replace('{elara_constraint}', ELARA_CONSTRAINT)
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'sciFiMoviePoster':
      prompt = SCI_FI_MOVIE_POSTER_PROMPT
        .replace('{title_requirement}', titleRequirement)
        .replace('{elara_constraint}', ELARA_CONSTRAINT)
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'vintageBurlesquePostcard':
      prompt = VINTAGE_BURLESQUE_POSTCARD_PROMPT
        .replace('{title_requirement}', titleRequirement)
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'vintagePostcard':
      prompt = VINTAGE_POSTCARD_PROMPT
        .replace('{title_requirement}', cleanInstruction ? `Title: ${cleanInstruction}` : "Title: Greetings from Paradise")
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'wantedPoster':
      const defaultName = `Jane Doe (aka The ${description ? description.split(' ')[0] : 'Suspect'})`;
      prompt = WANTED_POSTER_PROMPT
        .replace('{wanted_style}', wantedStyle === 'western' ? 'Old West Parchment' : 'Modern FBI Flyer')
        .replace('{title_requirement}', cleanInstruction ? `Name: ${cleanInstruction}` : `Name: ${defaultName}`)
        .replace('{captured_instruction}', flair ? "Apply a large, red, diagonal 'CAPTURED' or 'APPREHENDED' stamp across the image." : "No captured stamp.")
        .replace('{flair_requirement}', ''); // Flair is hijacked for captured stamp
      break;
    case 'asSeenOnTV':
      prompt = AS_SEEN_ON_TV_PROMPT.replace('{flair_requirement}', flairRequirement);
      break;

    // Cards / Games
    case 'mtgCard':
      prompt = MTG_CARD_PROMPT
        .replace('{title_requirement}', cleanInstruction ? `Name: ${cleanInstruction}` : "Name: The Planeswalker")
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'nonSportsCard':
      prompt = NON_SPORTS_CARD_PROMPT
        .replace('{title_requirement}', cleanInstruction ? `Name: ${cleanInstruction}` : "Name: Pocket Monster")
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'sportsCard':
      prompt = SPORTS_CARD_PROMPT
        .replace('{sport_type}', sport || 'Baseball')
        .replace('{title_requirement}', cleanInstruction ? `Player: ${cleanInstruction}` : "Player: Invent a heroic sports nickname")
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'videoGameCover':
      let platformStyling = "Standard DVD case.";
      if (console === 'xbox') platformStyling = "Green plastic case, neon green banner at top.";
      if (console === 'playstation') platformStyling = "Blue translucent case, blue banner at top.";
      if (console === 'nintendo') platformStyling = "Red plastic case, red corner logo.";
      if (console === 'pc') platformStyling = "PC DVD-ROM format, 'Games for Windows' banner.";
      
      prompt = VIDEO_GAME_COVER_PROMPT
        .replace('{platform_styling}', platformStyling)
        .replace('{title_requirement}', titleRequirement)
        .replace('{elara_constraint}', ELARA_CONSTRAINT)
        .replace('{flair_requirement}', flairRequirement);
      break;
    case 'badgePhoto':
      prompt = `Create a realistic ID Badge. ${TITLE_AND_INSTRUCTION_USER_PROVIDED.replace('{instruction}', cleanInstruction || 'Employee ID')}`;
      break;
      
    // Video
    case 'veoVideo':
        prompt = VEO_VIDEO_PROMPT.replace('{custom_instruction_requirement}', cleanInstruction || "Create a dramatic, high-quality cinematic animation of the scene.");
        break;

    default:
      prompt = FREESTYLE_PROMPT;
  }

  // Inject description if available (for context in some modes)
  if (description && !prompt.includes(description)) {
     prompt = `${prompt} \n\nContext from original image: ${description}`;
  }

  return prompt;
};

// --- MODEL CONFIGURATIONS ---
import type { ImageModelId, ModelConfig } from './types';

export const MODEL_CONFIGS: Record<ImageModelId, ModelConfig> = {
  'gemini-3-pro': {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro Image',
    description: 'Best quality, supports all 72 edit modes',
    videoModel: 'veo-31',
  },
  'gemini-25-flash': {
    id: 'gemini-25-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Faster generation, good quality',
    videoModel: 'veo',
  },
  'gpt-image-1': {
    id: 'gpt-image-1',
    name: 'OpenAI GPT-Image-1',
    description: 'OpenAI image generation with Sora video',
    videoModel: 'sora-2',
  },
};