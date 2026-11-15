/*
 * Named abilities that come with a species, origin or career, with their rules text, for the builder to open up on demand.
 * From the rules entries; proficiencies and equipment are already shown as plain items.
 */
export interface FeatureText {
  name: string;
  text: string;
}

export const SPECIES_FEATURES: Record<string, FeatureText[]> = {
  "aqualish": [
    { name: "Aquatic Movement", text: "When you take the Focus, you can swim up to Far range without making an Athletics roll" },
    { name: "Finned Hands", text: "You have disadvantage on Coordination rolls involving fine manual dexterity, and advantage on Strength rolls involving grip or holding power" },
    { name: "Tusks", text: "Your tusks act as an unarmed attack, with which you are proficient. Attack modifier is Strength (STR), 1 target, close range, 1d6 PHY damage" },
  ],
  "barabel": [
    { name: "Scaled hide", text: "While you wear no armour, you have an armour score equal to your Resilience (RES) modifier (minimum 1) that is effective against PHY damage. These slots are cleared with Tend to Wounds, not Repair Armour" },
    { name: "Prehensile tail", text: "You may use your tail to manipulate objects as well as your hands" },
    { name: "Needle-sharp teeth", text: "Your teeth act an unarmed attack, with which you are proficient. Attack modifier is Strength (STR), 1 target, close range, 1d6 phy damage" },
  ],
  "bith": [
    { name: "Musically adept", text: "Proficient with one musical instrument of choice and gain advantage when using your music instrument as part of a skill roll" },
    { name: "Analytical mind", text: "You are proficient in Investigation. Your culture's tradition of observation, calculation, and detail prizes the careful eye over the loud opinion." },
    { name: "Keen senses", text: "You have advantage on Perception or Investigation rolls that rely on hearing or smell" },
  ],
  "cerean": [
    { name: "Two hearts ", text: "Once per full rest, when you expend your last hit point slot, you can clear 1 hit point slot and dodge the dying condition" },
    { name: "Trance", text: "You gain the benefits of a Full rest in 4 hours rather than 8" },
  ],
  "gand": [
    { name: "Respirator", text: "You breathe ammonia. Without your respirator, treat Type I atmospheres as Type III. While wearing it, you ignore atmosphere saving rolls and are immune to inhaled poisons" },
    { name: "Exoskeleton", text: "While you wear no armour, you have an armour score equal to your Resilience (RES) modifier (minimum 1) that is effective against PHY damage. These slots are cleared with Tend to Wounds, not Repair Armour" },
    { name: "Regenerative", text: "At any time, even outside your Focus, you may mark 2 Willpower to clear 1 hit point slot. You can do this a number of times per full rest equal to your Resilience (RES) modifier (minimum once). You can't use this while Dying" },
  ],
  "human": [
    { name: "Defiant", text: "Once per short rest, add 1d4 to any unsuccessful action roll" },
  ],
  "dashade": [
    { name: "Claws", text: "Your claws act as an unarmed attack, with which you are proficient. Attack modifier is Strength (STR), 1 target, close range, 1d6 PHY damage" },
    { name: "Force-resistant", text: "You have advantage on saving rolls against Force powers" },
  ],
  "nautolan": [
    { name: "Amphibious", text: "You can breathe air and water" },
    { name: "Head-tail empathy", text: "You are proficient in Insight, and have advantage on Insight rolls to read the emotions of creatures within Near range" },
    { name: "Acute smell", text: "You have advantage on Perception rolls that rely on smell, in or out of water" },
  ],
  "pantoran": [
    { name: "Cold-adapted", text: "You ignore the effects of cold climates and have resistance to CLD damage." },
    { name: "Prideful", text: "You have advantage on saving rolls to resist being influenced" },
    { name: "Family markings (Optional)", text: "Some Pantorans wear simple golden facial tattoos to represent their clan or family, given in childhood and based on ancient Pantoran texts. The marks carry no mechanical effect, but they do speak loudly in any room of Pantorans." },
  ],
  "pkorian": [
    { name: "Two hearts", text: "Once per full rest, when you expend your last hit point slot, you can clear 1 hit point slot and dodge the dying condition" },
    { name: "Keen senses", text: "You are proficient in Perception. Once per short rest, when you fail an Agility saving roll, you may reroll and use the new result — your senses warn you a heartbeat before danger strikes" },
    { name: "Long fingers", text: "You have advantage on Coordination rolls involving fine manipulation, and advantage on Strength rolls involving grip or holding power" },
  ],
  "rodian": [
    { name: "Predator senses", text: "You have advantage on Perception rolls that rely on hearing or smell" },
  ],
  "togorian": [
    { name: "Retractable claws", text: "Your claws act as an unarmed attack, with which you are proficient. Attack modifier is Strength (STR), 1 target, close range, 1d6 PHY damage. Retracted claws count as concealed" },
    { name: "Pounce", text: "Once per short rest, when you take the Focus, you may move up to Far range without making an Athletics roll" },
  ],
  "tusken": [
    { name: "Survivors of the sands", text: "You are proficient in Survival. You ignore the effects of extreme heat, and desert terrain is never difficult terrain for you" },
    { name: "Savage protector", text: "Once per rest, when you make a melee Attack roll, you may first move up to twice Standard range without making an Athletics roll" },
    { name: "War cry", text: "Once per rest, make a Coercion roll against adversaries within Near range. On a success, mark off 1 additional Willpower and the targets gain the Frightened condition with you as the source" },
  ],
  "twilek": [
    { name: "Sharpened teeth (Optional)", text: "You have sharpened your teeth to sharp points which act an unarmed attack, with which you are proficient. Attack modifier is Strength (STR), 1 target, close range, 1d6 phy damage" },
  ],
  "wookiee": [
    { name: "Forest survivor", text: "You ignore the effects of cold climates and you have Advantage on Perception or Investigation rolls related to smell" },
  ],
  "evereni": [
    { name: "Read the room", text: "You are proficient in Insight. Your people learned long ago to spot the moment a deal turns." },
    { name: "Slippery tongue", text: "Once per short rest, when you fail a Deception or Negotiation roll, you may reroll and use the new result." },
    { name: "Sharpened teeth and nails", text: "Your teeth and nails act as an unarmed attack, with which you are proficient. Attack modifier is Strength (STR), 1 target, close range, 1d6 PHY damage." },
  ],
  "ikkrukkian": [
    { name: "Brave", text: "Advantage on all rolls to avoid being coerced or frightened" },
    { name: "Skull bulges", text: "Your skull bulges can be used as an unarmed attack, with which you are proficient. Attack modifier is Strength (STR), 1 target, close range, 1d6 phy damage" },
  ],
  "pooba": [
    { name: "Fearsome roar", text: "Once per short rest, unleash a thunderous roar. Make a Coercion roll against adversaries within Near range. On a success, mark off 1 additional Willpower and the target gains the Frightened condition with you as the source." },
    { name: "Furred skin", text: "You have resistance to CLD damage and have advantage on saving rolls against extreme cold climates" },
  ],
  "tynnan": [
    { name: "Tracker's nose", text: "You have Osmic sight out to 18m. You are proficient in Survival, and have advantage on Survival rolls to track by scent" },
    { name: "Cold-water blubber", text: "You ignore the effects of cold climates and gain advantage on saving rolls against extreme cold" },
    { name: "Freshwater swimmer", text: "You can swim at the same pace you move on land" },
  ],
  "vintian": [
    { name: "Stone-still", text: "Vintians rest by recrystallising. You gain the benefits of a Full rest in 4 hours and may do so while standing." },
    { name: "Magnetic deflection", text: "When you are targeted by a blaster attack dealing NRG damage, before the attack roll resolves, you may use a Trigger move. The attack deals no damage — your magnetic skin scatters the energy harmlessly." },
    { name: "Void-tolerant", text: "You can survive in the vacuum of space for up to 2 hours without harm. You do not need to eat or breathe, but you do drink mineral-rich water once a week." },
  ],
  "droid-2": [
    { name: "Scomp link (foundational module)", text: "You can interface with scomp ports to access information and control connected systems through skill rolls. This module is always equipped and does not count against your utility module slots." },
    { name: "Unarmoured", text: "You cannot wear conventional armour. Instead, during a full rest, you may retrofit any standard armour to your casing in order to gain its benefit" },
    { name: "Non-organic", text: "You do not need to eat, drink, or breathe. You are immune to poison and disease, and resistant to psychic damage. You are vulnerable to ION damage and have disadvantage on saving rolls against ION or lightning damage. If you cast tech powers, you do not require a tech focus" },
    { name: "Utility modules", text: "You have 4 module slots to spend on modules from the Utility Modules list. See Utility Modules in The Essential Guide to Droids for the full list and their costs" },
  ],
  "droid-3": [
    { name: "Tri-Lang III (foundational module)", text: "You are fluent in Galactic Basic, Binary, and five other languages of your choice. This module is always equipped and does not count against your utility module slots" },
    { name: "Non-organic", text: "You do not need to eat, drink, or breathe. You are immune to poison and disease, and resistant to psychic damage. You are vulnerable to ION damage and have disadvantage on saving rolls against ION or lightning damage. If you cast tech powers, you do not require a tech focus" },
    { name: "Utility modules", text: "You have 3 module slots to spend on modules from the Utility Modules list. See Utility Modules in The Essential Guide to Droids for the full list and their costs" },
  ],
  "droid-4": [
    { name: "Combat plating (foundational module)", text: "You have an armour score of 2 that is effective against PHY damage. This plating is always equipped and does not count against your utility module slots. It cannot be removed, repaired, or replaced" },
    { name: "Non-organic", text: "You do not need to eat, drink, or breathe. You are immune to poison and disease, and resistant to psychic damage. You are vulnerable to ION damage and have disadvantage on saving rolls against ION or lightning damage. If you cast tech powers, you do not require a tech focus" },
    { name: "Utility modules", text: "You have 2 module slots to spend on modules from the Utility Modules list. See Utility Modules in The Essential Guide to Droids for the full list and their costs" },
  ],
  "besalisk": [
    { name: "Four arms", text: "You can hold two extra items, or one extra item that needs two hands. While you grapple with two hands, you can still attack with the other two" },
  ],
  "lasat": [
    { name: "Sharp ears", text: "You have advantage on Perception rolls that rely on hearing" },
    { name: "Ashla's guidance", text: "Once per full rest, you may ask the GM one yes or no question about the right path forward. The answer is true, though it may be cryptic" },
  ],
  "trandoshan": [
    { name: "Flame-resistant scales", text: "You have resistance to FIR damage" },
    { name: "Regenerative", text: "As a Trigger move after you take Severe or Massive damage (after armour) without dropping to 0 hit point slots, you may mark 1 additional Willpower to clear 1 hit point slot. You can do this a number of times per full rest equal to your Resilience (RES) modifier (minimum once). Lost limbs regrow as a downtime project, with a Target Score set by the GM" },
  ],
  "kiffar": [
    { name: "Force-resistant", text: "You have advantage on saving rolls against Force powers" },
    { name: "Psychometry", text: "If your passive Force is 15 or more, you can use the Psychometry Force power once per full rest" },
    { name: "Qukuuf (Optional)", text: "Kiffar wear clan tattoos across the face, given in childhood and passed down the mother's line. The marks carry no mechanical effect, but any Kiffar can read them at a glance" },
  ],
  "anzellan": [
    { name: "Microlens eyes", text: "You have advantage on Investigation rolls that rely on sight" },
    { name: "Tiny physiology", text: "Choose one: +2 to Evasion, or advantage on Agility (AGI) saving rolls. You may swap your choice when you gain a level, but never have both" },
    { name: "Small and quiet", text: "You have advantage on Stealth rolls to hide or move quietly" },
    { name: "Undersized", text: "You cannot wield two-handed or heavy weapons or shields, and cannot wear armour heavier than light" },
  ],
  "zabrak": [
    { name: "Two hearts", text: "Once per full rest, when you expend your last hit point slot, you can clear 1 hit point slot and dodge the dying condition" },
  ],
  "kalleran": [
    { name: "Dense musculature", text: "You gain +1 Willpower slot" },
    { name: "Hypersensitive antennae", text: "You have advantage on Perception rolls that rely on hearing or smell. You can also hold a silent conversation by antenna-signing with anyone who has learned it" },
    { name: "Skin-breathers", text: "Your water needs are doubled" },
  ],
  "nikto": [
    { name: "Desert-born", text: "You ignore the effects of extreme heat, and you are proficient in Athletics" },
    { name: "Highlander", text: "You ignore the effects of cold climates, and you are proficient in Perception" },
    { name: "Hardy", text: "You have advantage on Resilience (RES) saving rolls against radiation and poison" },
  ],
  "anomid": [
    { name: "Voiceless", text: "You have no vocal cords. You start with a vocoder mask; without it, you cannot speak aloud" },
    { name: "Behind the mask", text: "You have advantage on rolls to hide your identity while masked" },
  ],
  "mon-calamari": [
    { name: "Amphibious", text: "You can breathe air and water" },
    { name: "Deep-water hide", text: "You have resistance to CLD damage" },
  ],
  "mustafarian": [
    { name: "Hardened hide", text: "You are proficient in Athletics, and you are immune to the Burning condition" },
    { name: "Heat-forged", text: "You have resistance to FIR damage and ignore the effects of extreme heat" },
  ],
  "tissshar": [
    { name: "Teeth and claws", text: "Your teeth and claws act as an unarmed attack, with which you are proficient. Attack modifier is Strength (STR), 1 target, close range, 1d6 PHY damage" },
    { name: "Business sense", text: "You have advantage on rolls to haggle, or to judge the real value of a deal" },
    { name: "Scale markings (Optional)", text: "Tiss'shar lineages, such as the kal-ar, sil-ar and albino isk-ar, are told apart by the patterns on their scales. The markings carry no mechanical effect" },
  ],
};

export const ORIGIN_FEATURES: Record<string, FeatureText[]> = {
  "abandoned": [
    { name: "Survivor’s Instinct", text: "Once per short rest, reroll a failed Survival or Perception check. Must use the new roll" },
  ],
  "hardened": [
    { name: "Street Smarts", text: "Advantage on Insight rolls in urban or underworld environments." },
    { name: "Indomitable Spirit", text: "Once per short rest, you gain advantage on rolls to avoid being Influenced or Frightened." },
  ],
  "optimist": [
    { name: "Optimistic Courage", text: "Once per short rest, add 1d4 to any action roll before the outcome is known" },
    { name: "Drawback", text: "You have disadvantage on Insight rolls to detect deception or hostile intent. You read joy and sorrow easily, but you assume the best of those who would deceive you" },
  ],
  "prospect": [
    { name: "Eager initiate", text: "Once per short rest, gain advantage on one skill check or attack roll when acting under supervision or with allies nearby" },
  ],
  "tribal": [
    { name: "Tribal Connection", text: "Advantage on Negotiation rolls with those who are part of a tribal culture." },
  ],
  "survivor": [
    { name: "Tragic Resilience", text: "Once per full rest, when reduced to 0 hit point slots, drop to 1 hit point slot instead." },
  ],
  "addict": [
    { name: "Running on Empty", text: "Once per short rest, when you take the Focus, ignore Willpower penalties until the Focus passes. Your action rolls resolve as normal, and you still mark and clear Willpower slots as usual." },
  ],
  "everyman": [
    { name: "Resourceful", text: "Once per full rest, after you fail a Dyad roll, reroll both dice and use the new result." },
  ],
  "exile": [
    { name: "Adaptable Survivor", text: "After each full rest, choose one skill or tool you aren’t proficient with. You’re proficient with it until your next full rest." },
  ],
  "privileged": [
    { name: "Name and means", text: "Once per full rest, invoke your family name, title or fortune to open a door: an audience, a favour, safe passage or a modest sum of credits, as fits the fiction." },
  ],
};

export const CAREER_FEATURES: Record<string, FeatureText[]> = {
  "bounty-hunter": [
    { name: "Feared", text: "You have Advantage on Coercion rolls" },
    { name: "Resourceful Hunter", text: "Make a casting roll against a target to ensnare them in an energy snare. On a success, mark off 1 additional Willpower slot and immobilise your target. Your casting modifier is your Intelligence (INT) modifier + proficiency bonus" },
  ],
  "droidsmith": [
    { name: "Droid Saviour", text: "Mark off 1 Willpower slot to repair any droid within Close range by 1 Hit Point slot" },
    { name: "Droid Speaker", text: "You have Advantage on Negotiation rolls with droids and cybernetic beings. You can also understand the binary, beeps, and chitters of droids without a translator" },
  ],
  "force-scholar": [
    { name: "Otherworldly Knowledge", text: "You have Advantage on Religion and History rolls relating to the Force, ancient orders, and Force-using cultures" },
    { name: "Echoes in the Dust", text: "When you spend time at a Force-touched site (a ruin, a relic, a place where the Force has gathered) you may make a History or Religion roll to glimpse what happened there. The GM tells you something true about its past on a success" },
  ],
  "freedom-fighter": [
    { name: "Bolstered Resolve", text: "Once per Full Rest, when you are reduced to 1 Willpower slot, you regain Willpower slots equal to your Presence (PRE) modifier" },
  ],
  "jedi-knight": [
    { name: "Trained in the Jedi Arts", text: "Gain access to Basic Force Powers. You may select an additional Tier 0 Force Power if you gain this feature from your Origin or Path" },
  ],
  "scholar": [
    { name: "Sage Advice", text: "Offer advice to a number of allies who can hear you equal to your Intelligence (INT) modifier. Select a skill or tool you are proficient with. Once in the next hour, the next time an advised ally makes a roll using the chosen skill or tool, they may add your proficiency bonus to the roll if they are not already proficient" },
  ],
  "smuggler": [
    { name: "Hidden Compartments", text: "You have Advantage on Stealth or Skulduggery rolls when concealing items" },
    { name: "Deceptive Charm", text: "Once per Full Rest, you may reroll a failed Skulduggery roll and take the higher result" },
  ],
  "pilot": [
    { name: "Skilled Pilot", text: "Add your Agility (AGI) modifier to your ship’s Evasion during space combat" },
    { name: "Port Familiar", text: "You know someone in nearly every starport. Once per Full Rest, when you arrive somewhere new, you may declare a contact you know there (a mechanic, a smuggler, a dock officer, an old friend). The GM works with you on the details. Treat them as a Friendly NPC for one favour, after which their attitude is up to the GM" },
  ],
  "dj": [
    { name: "Adept Controller", text: "You have Advantage on Technology or Coordination rolls made to operate, override, or improvise with physical interfaces: instrument panels, control rigs, instruments, vehicle controls" },
    { name: "Read the Crowd", text: "You can read the energy of a crowd, a cantina, or a tense room as easily as a track. Once per Full Rest, you may declare what the dominant mood is (fearful, hostile, eager, distracted, sympathetic) and the GM confirms or corrects you. You then gain Advantage on your next Influence roll that plays into that mood" },
  ],
  "jedi-wayseeker": [
    { name: "Trained in the Jedi Arts", text: "Gain access to Basic Force Powers. You may select an additional Tier 0 Force Power if you gain this feature from your Origin or Path" },
    { name: "Guided by the Force", text: "Whilst travelling unfamiliar terrain or making your way to a destination you have not visited before, you have Advantage on Survival rolls. Once per Full Rest, when you would fail an Insight or Survival roll whilst seeking a path, person, or truth, you may reroll and take the higher result" },
  ],
  "gladiator": [
    { name: "Blood and Sand", text: "When you reduce an adversary to 0 Hit Point slots with a Minor Critical Success, clear 2 Willpower slots as adrenaline and the roar of the crowd surge through you" },
  ],
  "labourer": [
    { name: "Grit", text: "You gain +1 Hit Point slot (starting maximum 7 instead of 6)" },
    { name: "Hard Graft", text: "When working on a physical task that requires sustained effort over time (repairs, hauling, digging, building) you complete the work in half the time it would take an unskilled hand" },
  ],
  "meknek": [
    { name: "Risk Averse", text: "Whilst in zero gravity, you ignore Disadvantage on all rolls. Gripton boots and hard-earned instinct keep you anchored. You also have Advantage on saving rolls made to avoid falling, slipping, or being thrown clear of a surface" },
    { name: "Hull Sense", text: "When making a Technology roll to repair, diagnose, or jury-rig a starship, whether dockside or mid-flight, you may add your Resilience (RES) modifier to the roll instead of Intelligence" },
  ],
  "outlaw": [
    { name: "Wanted", text: "You begin play with a bounty on your head. The GM and you decide together who placed it, why, and how big it is. When the bounty is active in a scene (agents are searching, posters are up, recognition is a real risk) you have Advantage on Stealth rolls to move unseen, and on Insight rolls to spot informers and tails" },
    { name: "Nothing Left to Lose", text: "Once per Full Rest, when you would mark off your last Willpower slot, you instead clear 1 Willpower slot and gain Advantage on your next action roll. You’ve been here before" },
  ],
  "criminal": [
    { name: "Connected", text: "You have ties to a criminal organisation (gang, syndicate, or local crew, decided with the GM at character creation). Once per session, you may declare you know someone here: a fence, an enforcer, a contact who owes a favour. The GM works with you on the details. Treat them as a known figure within the underworld, with their own loyalties and demands" },
    { name: "Reading the Room", text: "You can spot trouble before it lands. You have Advantage on Insight rolls to detect lies, threats, or hidden weapons in social situations, and on Perception rolls to notice surveillance, marks, or tails" },
  ],
  "treasure-hunter": [
    { name: "Fortune Favours the Bold", text: "Once per encounter, you may reroll a failed Agility or Perception roll and take the higher result. Luck and instinct catch you when judgement doesn’t" },
    { name: "Lore of the Lost", text: "When you encounter ruins, ancient sites, or relics of a forgotten civilisation, you may make a History roll to recall a useful detail: a layout, a hazard, a likely hiding place. The GM tells you something true and useful on a success" },
  ],
  "ambassador": [
    { name: "Credentials", text: "Once per full rest, invoke your office to secure an audience, a parley or safe passage from anyone who recognises your authority" },
    { name: "Common Ground", text: "You have Advantage on Negotiation rolls to broker a deal or settle a dispute between two other parties" },
  ],
  "assassin": [
    { name: "Silent Execution", text: "When you hit with an attack while Hidden, add 1d6 to the damage. You may then move within Near range without triggering trigger moves" },
  ],
  "crime-lord": [
    { name: "Ruthless Authority", text: "Once per full rest, make a Coercion roll against the Difficulty of an NPC or adversary within Near range. On a success, they carry out one order of your choosing. Your hold lasts until you release them, move beyond Far range, or fall Unconscious. At any time, the GM may spend 1 Despair to test your grip: repeat the Coercion roll, and on a failure the hold breaks. Commanders and Nemeses are unaffected" },
  ],
  "engineer": [
    { name: "Structural Eye", text: "Study a vehicle, structure or machine for a moment and the GM names its weakest point. The next hit against it counts as one threshold higher" },
    { name: "Field Fix", text: "As a manoeuvre, mark 1 Willpower to take the Repair Armour downtime move during play, outside of downtime. Roll 1d4 and clear that many armour slots on yourself or an ally within Close range. You can do this a number of times per full rest equal to your Intelligence (INT) modifier (minimum once)" },
  ],
  "jedi-outcast": [
    { name: "Trained in the Jedi Arts", text: "Gain access to Basic Force Powers. You may select an additional Tier 0 Force Power if you gain this feature from your Origin or Path" },
    { name: "Buried Light", text: "You have Advantage on rolls to hide who you are or who you were: passing a checkpoint, lying about your past, keeping your lightsaber out of sight. You also have Advantage on Force (FOR) saving rolls to avoid being sensed through the Force" },
  ],
  "pathfinder": [
    { name: "First Contact", text: "You have Advantage on your first Influence roll with a people meeting your faction, or any outsiders, for the first time. Even without a shared language, you can always get across basic intent: peace, danger, help, leave" },
    { name: "Forging the Route", text: "While you lead the party’s travel through uncharted space or terrain, the group can move at a Fast pace without its usual penalty" },
  ],
  "slicer": [
    { name: "Routine Job", text: "When you slice a system with a Target Score of 12 × your proficiency bonus or lower, you bypass it immediately, without rolling (24 at levels 1 to 4, 36 at 5 to 8, 48 at 9 to 12)" },
    { name: "Clean Exit", text: "You have Advantage on rolls to erase the traces of your slicing" },
  ],
  "pod-racer": [
    { name: "Racer’s reflexes", text: "You have Advantage on rolls to avoid collisions, debris and hazards while piloting a vehicle at speed. Outside a cockpit, those same reflexes give you Advantage on Agility (AGI) saving rolls against falling, collapsing or exploding hazards" },
    { name: "Redline", text: "Once per Full Rest, mark off 1 WP to push a vehicle you’re piloting past its limits. For a Countdown (4), it moves at twice its top speed. When the Countdown ends, roll 1d6: on a 1, something burns out, and the vehicle can’t redline again until it’s repaired" },
  ],
};
