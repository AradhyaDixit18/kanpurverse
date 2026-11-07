"use client";
import kanpuriya from "../../../../assets/dialogues/kanpuriya.json";
import hindi from "../../../../assets/dialogues/hindi.json";
import english from "../../../../assets/dialogues/english.json";
import { DialogueFile, type DialogueLine, type Language } from "@kanpurverse/shared";
import { useStore } from "../state/store";

const files: Record<Language, DialogueLine[]> = { kanpuriya: DialogueFile.parse(kanpuriya).lines, hindi: DialogueFile.parse(hindi).lines, english: DialogueFile.parse(english).lines };
export function linesFor(lang: Language) { return files[lang]; }
export function useDialogueLines() { const lang = useStore(s => s.settings.lang); return files[lang]; }
