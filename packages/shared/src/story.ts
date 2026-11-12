/**
 * Kanpur Chronicles — main story campaign (single player).
 *
 * Eight chapters starring Kanupriya Tommy. Every chapter is a MissionDef in world.ts, so it reuses the
 * existing checkpoint, timer, save, reward and failure systems. This file adds the story layer:
 * chapter order, unlock rules, the chapter giver, and the intro/outro cutscene scripts.
 *
 * All people, businesses and events here are fictional. Sunehri Mithai is an invented shop; no real
 * sweet shop, trader, official or family is depicted or implied to take part in wrongdoing.
 */

export const GAME_TITLE = "Kanpur Chronicles";
export const GAME_TITLE_HI = "कानपुर क्रॉनिकल्स";
export const GAME_TAGLINE = "City of Stories";
export const GAME_TAGLINE_HI = "कहानियों का शहर";
export const STUDIO = "Velto Studios";

export const PROTAGONIST = {
  id: "kanupriya",
  name: "Kanupriya Tommy",
  nameHi: "कनुप्रिया टॉमी",
  handle: "Kanupriya",
} as const;

export interface CutsceneLine { speaker: string; speakerHi: string; hi: string; en: string }
export interface StoryChapter {
  n: number;
  missionId: string;
  title: string;
  titleHi: string;
  giver: string;
  /** Objective text shown per checkpoint (Hindi first, English second). */
  objectives: [string, string][];
  intro: CutsceneLine[];
  outro: CutsceneLine[];
}

const K = (hi: string, en: string): CutsceneLine => ({ speaker: PROTAGONIST.name, speakerHi: PROTAGONIST.nameHi, hi, en });
const B = (hi: string, en: string): CutsceneLine => ({ speaker: "Babloo Bhaiya", speakerHi: "बबलू भैया", hi, en });
const R = (hi: string, en: string): CutsceneLine => ({ speaker: "Raju Auto", speakerHi: "राजू ऑटो", hi, en });
const S = (hi: string, en: string): CutsceneLine => ({ speaker: "Singh Saheb", speakerHi: "सिंह साहब", hi, en });
const G = (hi: string, en: string): CutsceneLine => ({ speaker: "Gupta ji", speakerHi: "गुप्ता जी", hi, en });
const M = (hi: string, en: string): CutsceneLine => ({ speaker: "Munna Chaiwala", speakerHi: "मुन्ना चायवाला", hi, en });
const L = (hi: string, en: string): CutsceneLine => ({ speaker: "Lalten Seth", speakerHi: "लालटेन सेठ", hi, en });
const N = (hi: string, en: string): CutsceneLine => ({ speaker: "", speakerHi: "", hi, en });

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    n: 1, missionId: "story_01_wapsi", title: "The Return to Kanpur", titleHi: "कानपुर वापसी", giver: "guide_babloo",
    objectives: [
      ["मुन्ना की चाय की दुकान पर चलो।", "Walk to Munna's chai stall."],
      ["बड़ा चौराहा देखो — शहर बदला है या नहीं?", "Check Bada Chauraha: has the city changed?"],
      ["ज़ेड स्क्वायर पर मेले का पोस्टर देखो।", "Find the mela poster at Z Square."],
    ],
    intro: [
      N("चार साल बाद। मॉल रोड, कानपुर।", "Four years later. The Mall Road, Kanpur."),
      B("अरे! कनुप्रिया? टॉमी! का हो, दिल्ली जाके हम लोगन को भुलाय दिहो का?", "Hey! Kanupriya? Tommy! What, did Delhi make you forget us?"),
      K("भुलाती तो लौटती का, भइया? तुम्हरी चिट्ठी पढ़ी। सच्ची में गंगा मेला बंद होय रहा है?", "Would I be back if I'd forgotten? I read your letter. The Ganga Mela is shutting down?"),
      B("पहिले जरा शहर देख आओ। फिर चाय पे बैठ के पूरा किस्सा सुनाते हैं।", "See the city first. Then I'll tell you everything over chai."),
    ],
    outro: [
      K("पोस्टर पे लिखा है 'सुनहरा लड्डू लॉटरी, इनाम एक लाख'। ये मेले वाला तो बिल्कुल नहीं लगता, भइया।", "The poster says 'Golden Laddoo Lottery, prize one lakh'. That's not the real mela."),
      B("यही तो पूरा चक्कर है गुरु। कोई लालटेन सेठ है, मेले के नाम पे नकली पास बेच रहा है।", "That's the whole racket. A man called Lalten Seth is selling passes in the mela's name."),
      K("कानपुर की कहानी अभी बाकी है।", "Kanpur's story isn't over yet."),
    ],
  },
  {
    n: 2, missionId: "laddoo_chakkar", title: "Laddoo Ka Chakkar", titleHi: "लड्डू का चक्कर", giver: "guide_babloo",
    objectives: [
      ["बबलू: सुनहरी मिठाई के दरवाज़े तक चलो। E से बात आगे बढ़ाओ।", "Go to the door of Sunehri Mithai. Press E."],
      ["अंदर जाओ। सुनहरा लड्डू सामने है — E से उठाओ।", "Go inside. Pick up the golden laddoo with E."],
      ["मेले का खेल! Marshal से बचकर राजू के स्टैंड पहुँचो। E दबाओ।", "Dodge the marshal and reach Raju's stand. Press E."],
      ["बबलू के पास लौटो और E से इनाम लो।", "Return to Babloo and press E."],
    ],
    intro: [
      B("सुनहरी मिठाई वाले भी परेशान बैठे हैं। लालटेन सेठ ने उनके नाम से नकली 'सुनहरा लड्डू' टिकट छपवाय दिए।", "Sunehri Mithai is worried too. Lalten Seth printed fake 'golden laddoo' tickets in their name."),
      K("तो असली सुनहरा लड्डू ही सबूत बनेगा। दुकान वालों से पूछ के ले चलते हैं, चोरी-वोरी नहीं।", "Then the real golden laddoo is our proof. We take it with the owner's permission."),
      B("मेले का marshal सेठ का आदमी है। पकड़ी गईं तो सारा खेल खतम, समझीं?", "The fair marshal works for the Seth. Get caught and the act is over!"),
    ],
    outro: [
      K("असली लड्डू पे दुकान की मुहर लगी है। सेठ के टिकट पे कुछ नहीं।", "The real laddoo carries the shop's seal. The Seth's tickets don't."),
      B("लेओ, हमरी पुरानी हैचबैक की चाबी। कानपुर नापना है तो पैदल न हो पाई।", "Here, keys to our old hatchback. You'll need wheels for this city."),
    ],
  },
  {
    n: 3, missionId: "story_03_mall_road", title: "Mall Road Trouble", titleHi: "मॉल रोड पे बवाल", giver: "auto_raju",
    objectives: [
      ["क्राइस्ट चर्च वाले मोड़ पर नकली पोस्टर हटाओ।", "Clear the fake posters at the Christ Church turn."],
      ["नाना राव पार्क के गेट तक पहुँचो।", "Reach the Nana Rao Park gate."],
      ["बड़ा चौराहा पर राजू को रिपोर्ट करो।", "Report back to Raju at Bada Chauraha."],
    ],
    intro: [
      R("अरे गुरु, जरा सुनो तो! सेठ के लौंडे मॉल रोड के हर खंभे पे पोस्टर चिपकाय रहे हैं।", "Hey, listen! The Seth's boys are pasting posters on every pole of Mall Road."),
      K("और तुम्हरी सवारियाँ इन्हीं पोस्टरों से पास खरीद रही हैं?", "And your passengers are buying passes from these posters?"),
      R("हाँ मैडम! पाँच मिनट में पूरा रूट साफ़ करो, नहीं तो शाम के जाम में फँस जाओगी।", "Yes! Clear the route in five minutes or the evening rush will swallow you."),
    ],
    outro: [
      R("मान गए मैडम, चकाचक काम! एक पोस्टर पे पता छपा है, नवीन मार्केट, पिछली गली।", "Respect! One poster has an address printed on it: Naveen Market, the back lane."),
      K("तो सेठ की छपाई वहीं होती है। पर पहिले एक पार्सल का पता लगाना है।", "So that's where the Seth prints. But first there's a parcel to trace."),
    ],
  },
  {
    n: 4, missionId: "story_04_railway", title: "Railway Run", titleHi: "रेलवे रन", giver: "police_singh",
    objectives: [
      ["नयागंज होते हुए निकलो।", "Head out through Nayaganj."],
      ["रेलवे फाटक पर रुको — बंद फाटक कभी मत फाँदो।", "Stop at the railway crossing. Never jump a closed gate."],
      ["ट्रेन छूटने से पहले कानपुर सेंट्रल पहुँचो।", "Reach Kanpur Central before the train leaves."],
    ],
    intro: [
      S("बिटिया, ख़बर पक्की है। सेठ के नकली पासों का बक्सा आज वाली ट्रेन से बाहर जा रहा है।", "Young lady, the tip is solid. A box of the Seth's fake passes leaves on today's train."),
      K("और आपकी जीप, सिंह साहब?", "And your jeep?"),
      S("जीप थाने में खड़ी है, हम इहाँ। जल्दी पहुँचो, पर क़ानून के अंदर। फाटक बंद हो तो रुकना है।", "Jeep's at the station, I'm here. Get there fast, and stay within the law. Respect the crossing."),
    ],
    outro: [
      S("बक्सा मिल गया। रसीद पे दस्तख़त किसी 'एल. सेठ' के हैं, और माल नवीन मार्केट से उठा था।", "We have the box! The receipt is signed 'L. Seth', and the goods came from Naveen Market."),
      K("मतलब सारे रास्ते नवीन मार्केट ही जाते हैं।", "Every road leads to Naveen Market."),
    ],
  },
  {
    n: 5, missionId: "story_05_naveen", title: "Naveen Market Mystery", titleHi: "नवीन मार्केट का राज़", giver: "shop_gupta",
    objectives: [
      ["नवीन मार्केट के गेट पर सुराग़ ढूँढो।", "Search for clues at the Naveen Market gate."],
      ["सुनीता जी की सब्ज़ी वाली गली देखो।", "Check Sunita ji's vegetable lane."],
      ["लाल इमली मिल की पुरानी दीवार तक जाओ।", "Go to the old wall of the Lal Imli mills."],
      ["चुन्नीगंज में छापाख़ाने का पता लगाओ।", "Locate the print shop in Chunniganj."],
    ],
    intro: [
      G("बिटिया, हमरी दुकान के पीछे रात भर मशीन चलती है। ठक-ठक-ठक, पर दुकान किसी की है ही नहीं।", "Dear, a machine runs behind my shop at night. Thud-thud, but no one owns that shop."),
      K("छपाई की मशीन। सेठ छापता इहाँ है और माल छिपाता कहीं और।", "A printing press. The Seth prints here and hides it elsewhere."),
      G("पहिले काम पूरा करो, फिर चाय पीते हैं!", "Finish the job first, then we'll have chai!"),
    ],
    outro: [
      K("चुन्नीगंज वाला गोदाम खाली पड़ा है। बस एक पर्ची मिली: 'मेले की शाम, घाट पे।'", "The Chunniganj warehouse is empty. Just a note: 'Mela evening, at the ghat.'"),
      L("(फ़ोन पे) लड़की बहुत तेज़ निकली। मेले की शाम तक उसे शहर से दूर रखो, समझे?", "(on the phone) The girl is too quick. Keep her away from the city until mela evening."),
    ],
  },
  {
    n: 6, missionId: "story_06_ghat", title: "Ganga Ghat", titleHi: "गंगा घाट", giver: "chai_munna",
    objectives: [
      ["मोती झील पर मुन्ना के भाई से मिलो।", "Meet Munna's brother at Moti Jheel."],
      ["परमट घाट पहुँचो और मेले का मंच देखो।", "Reach Parmat Ghat and scout the mela stage."],
    ],
    intro: [
      M("टॉमी बिटिया, तुम्हरी नानी इसी घाट पे दीये बेचती थीं। याद है कि नहीं?", "Tommy dear, your nani sold diyas on this very ghat. Remember?"),
      K("याद है मुन्ना चाचा। इसीलिए तो लौटी हूँ।", "I remember, Munna chacha. That's why I came back."),
      M("हमरा भाई झील पे नाव चलाता है। उसने सेठ के आदमी देखे हैं। जाओ, मिल लेओ।", "My brother rows boats at the lake. He's seen the Seth's men. Go meet him."),
    ],
    outro: [
      K("मंच के पीछे बड़ी स्क्रीन लगी है। सेठ आज शाम 'लॉटरी' का ड्रॉ इहीं करेगा, सबके सामने।", "There's a big screen behind the stage. The Seth will run his 'lottery' draw here tonight, in public."),
      K("तो सबूत भी इहीं दिखेगा, सबके सामने।", "Then the proof gets shown here too, in public."),
    ],
  },
  {
    n: 7, missionId: "story_07_danger", title: "The City in Danger", titleHi: "शहर ख़तरे में", giver: "police_singh",
    objectives: [
      ["नवीन मार्केट: गुप्ता जी से गवाही का बयान लो।", "Naveen Market: collect Gupta ji's statement."],
      ["ग्रीन पार्क गेट: राजू से फ़ोन रिकॉर्डिंग लो।", "Green Park gate: pick up Raju's phone recording."],
      ["फूल बाग़: सारे सबूत सिंह साहब तक पहुँचाओ।", "Phool Bagh: hand all the evidence to Singh Saheb."],
    ],
    intro: [
      S("सेठ ने पूरे शहर में अफ़वाह उड़ा दी है कि मेला रद्द है और 'असली पास' बस उसी के पास हैं।", "The Seth has spread a rumour that the mela is cancelled and only he sells 'real' passes."),
      S("लोग घाट जाने की जगह उसकी दुकानों पे लाइन लगाय रहे हैं। छह मिनट में सबूत चाहिए।", "People are queuing at his stalls instead of the ghat. I need evidence in six minutes."),
      K("आप बोलिए मत साहब, बस घड़ी देखते रहिए।", "Don't say a word, sir. Just watch the clock."),
    ],
    outro: [
      S("बयान, रिकॉर्डिंग, रसीद, सब पक्का है। अब वारंट निकलेगा।", "Statement, recording, receipt: all solid. Now the warrant goes out."),
      K("वारंट निकलने से पहले सेठ घाट से पैसा लेकर भागेगा। आख़िरी चाल हमें चलनी है।", "Before the warrant, the Seth will run from the ghat with the money. The last move is ours."),
    ],
  },
  {
    n: 8, missionId: "story_08_finale", title: "The Final Chapter", titleHi: "आख़िरी अध्याय", giver: "guide_babloo",
    objectives: [
      ["सुनहरी मिठाई: असली मुहर वाला लड्डू उठाओ।", "Sunehri Mithai: collect the laddoo with the real seal."],
      ["कानपुर सेंट्रल: सेठ का कूरियर पकड़ने से पहले पहुँचो।", "Kanpur Central: get there before the Seth's courier."],
      ["नवीन मार्केट: गुप्ता जी को मंच के लिए साथ लो।", "Naveen Market: bring Gupta ji to the stage."],
      ["परमट घाट: मेले की स्क्रीन पर सच दिखाओ!", "Parmat Ghat: show the truth on the mela screen!"],
    ],
    intro: [
      N("मेले की शाम। गंगा किनारे दीये जलने लगे हैं।", "Mela evening. Diyas are lighting up along the Ganga."),
      B("टॉमी, पूरा शहर घाट की ओर जाय रहा है। ड्रॉ के बाद सेठ सीधा स्टेशन भागेगा।", "Tommy, the whole city is heading to the ghat. After the draw the Seth runs straight for the station."),
      K("तो हम उसकी हर चाल से एक कदम आगे रहेंगे। मॉल रोड से घाट तक, आज एक ही रात में।", "Then we stay one step ahead of every move. Mall Road to the ghat, in one night."),
      L("बिटिया, कानपुर वाले सीधे लोग हैं। ये शहर तो अपना है।", "Kanpur folk are simple, girl. This city is mine."),
      K("ग़लतफ़हमी है सेठ जी। ये शहर कानपुर वालों का है। झाड़े रहो कलेक्टरगंज!", "You've got it wrong, Seth ji. This city belongs to the people of Kanpur. Jhaade raho Collectorganj!"),
    ],
    outro: [
      N("परमट घाट। बड़ी स्क्रीन पे एक के बाद एक: असली मुहर, नकली टिकट, सेठ की रिकॉर्डिंग।", "Parmat Ghat. On the big screen: the real seal, the fake tickets, the Seth's recording, one after another."),
      L("ये... ये सब झूठ है! एडिट किया हुआ है!", "This... this is all lies! It's been edited!"),
      S("बाकी बातें थाने में करेंगे, सेठ जी। सबका पैसा वापस होगा।", "Save the rest for the station, Seth ji. Everyone gets their money back."),
      M("मेला चलेगा! गंगा मैया की जय!", "The mela goes on! Glory to Mother Ganga!"),
      B("का हो टॉमी, अब दिल्ली लौट जाओगी?", "So Tommy, back to Delhi now?"),
      K("दिल्ली? अरे भइया, कानपुर की कहानी अभी बाकी है!", "Delhi? Bhaiya, Kanpur's story isn't over yet!"),
    ],
  },
];

export const STORY_MISSION_IDS = STORY_CHAPTERS.map(c => c.missionId);
export const FINALE_ID = "story_08_finale";
export function chapterFor(missionId: string): StoryChapter | undefined { return STORY_CHAPTERS.find(c => c.missionId === missionId); }

/** A chapter is playable once the previous chapter is complete (or it has been completed before). */
export function storyUnlocked(missionId: string, completed: readonly string[]): boolean {
  const i = STORY_CHAPTERS.findIndex(c => c.missionId === missionId);
  if (i < 0) return true;
  if (i === 0 || completed.includes(missionId)) return true;
  return completed.includes(STORY_CHAPTERS[i - 1].missionId);
}
/** Next unfinished chapter, or undefined after the finale. */
export function nextChapter(completed: readonly string[]): StoryChapter | undefined {
  return STORY_CHAPTERS.find(c => !completed.includes(c.missionId));
}
/** Side missions open once Chapter 2 is complete (preserves the original first-story gate). */
export function sideMissionsOpen(completed: readonly string[]): boolean { return completed.includes("laddoo_chakkar"); }

export const CREDITS: [string, string][] = [
  ["Kanpur Chronicles", "A Velto Studios game"],
  ["Starring", "Kanupriya Tommy"],
  ["Story, design & engineering", "Velto Studios"],
  ["Map data", "© OpenStreetMap contributors (ODbL 1.0)"],
  ["Textures & skies", "ambientCG, Poly Haven (CC0)"],
  ["Voices", "Microsoft Edge neural TTS"],
  ["Engine", "three.js · React Three Fiber · Rapier · Next.js"],
  ["Thank you", "कानपुर, हमारी कहानियों का शहर"],
];
