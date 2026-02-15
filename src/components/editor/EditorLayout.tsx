"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LeftPanel from "@/src/components/editor/LeftPanel";
import PreviewPane from "@/src/components/editor/PreviewPane";
import TopBar from "@/src/components/editor/TopBar";
import InspectorPanel from "@/src/components/editor/right/InspectorPanel";
import { getDb } from "@/src/db/db";
import { createProjectFromTemplate, useEditorStore } from "@/src/store/editorStore";
import type { ProjectState } from "@/src/types/project";

const RIGHT_PANEL_WIDTH = 360;
const TEMPLATE_STORAGE_KEY = "lp-editor.template";

type TemplateOption = {
  id: string;
  title: string;
  description: string;
  templateType: ProjectState["meta"]["templateType"];
};

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "campaign",
    title: "キャンペーン",
    description: "クーポン/ポイント施策向けの標準LP構成",
    templateType: "coupon",
  },
];

export default function EditorLayout() {
	const [leftWidth, setLeftWidth] = useState(320);
	const [templateChooserOpen, setTemplateChooserOpen] = useState(false);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
	const manualSaveTick = useEditorStore((state) => state.manualSaveTick);
	const project = useEditorStore((state) => state.project);
	const hasUserEdits = useEditorStore((state) => state.hasUserEdits);
	const setProject = useEditorStore((state) => state.setProject);
	const replaceProject = useEditorStore((state) => state.replaceProject);
	const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
	const setPageBackground = useEditorStore((state) => state.setPageBackground);
	const projectRef = useRef(project);
	const lastSavedVersionRef = useRef<string | undefined>(
		project.meta.updatedAt
	);
	const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const autoSaveInFlightRef = useRef(false);
	const randomBgAppliedRef = useRef(false);
	const loadAttemptedRef = useRef(false);
	const lastTemplate = useMemo(
		() =>
			TEMPLATE_OPTIONS.find((option) => option.id === selectedTemplateId) ?? null,
		[selectedTemplateId]
	);

	useEffect(() => {
		const stored = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
		if (stored) {
			setSelectedTemplateId(stored);
		}
	}, []);

	useEffect(() => {
		projectRef.current = project;
	}, [project]);

	useEffect(() => {
		if (loadAttemptedRef.current) {
			return;
		}
		loadAttemptedRef.current = true;
		const loadProject = async () => {
			try {
				const db = await getDb();
				const record = await db.projects.get("project_default");
				if (!record?.data) {
					setTemplateChooserOpen(true);
					return;
				}
				replaceProject(record.data);
				setSaveStatus("saved", "保存データを読み込みました");
				setTemplateChooserOpen(false);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "保存データの読み込みに失敗しました。";
				setSaveStatus("error", message);
				setTemplateChooserOpen(true);
			}
		};
		void loadProject();
	}, [replaceProject, setSaveStatus]);

	const handleTemplateSelect = (option: TemplateOption) => {
		window.localStorage.setItem(TEMPLATE_STORAGE_KEY, option.id);
		setSelectedTemplateId(option.id);
		setProject(createProjectFromTemplate(option.templateType, option.title));
		setTemplateChooserOpen(false);
	};

	useEffect(() => {
		if (randomBgAppliedRef.current) {
			return;
		}
		const pageBg = project.settings?.backgrounds?.page;
		const isDefaultWhite =
			pageBg?.type === "solid" && pageBg.color === "#ffffff";
		if (!pageBg || !isDefaultWhite) {
			return;
		}
		const palette = [
			["#fff4e6", "#ffe8cc"],
			["#e7f5ff", "#d0ebff"],
			["#f3f0ff", "#e5dbff"],
			["#ebfbee", "#d3f9d8"],
			["#fff0f6", "#ffdeeb"],
		];
		const pick = palette[Math.floor(Math.random() * palette.length)];
		const angle = Math.floor(Math.random() * 360);
		setPageBackground({
			type: "gradient",
			angle,
			stops: [
				{ color: pick[0], pos: 0 },
				{ color: pick[1], pos: 100 },
			],
		});
		randomBgAppliedRef.current = true;
	}, [project.settings?.backgrounds?.page, setPageBackground]);

	useEffect(() => {
		if (!hasUserEdits) {
			lastSavedVersionRef.current = project.meta.updatedAt;
		}
	}, [hasUserEdits, project.meta.updatedAt]);

	const saveProject = useCallback(
		async (reason: "auto" | "interval" | "manual") => {
			if (autoSaveInFlightRef.current) {
				return;
			}
			if (
				reason !== "manual" &&
				lastSavedVersionRef.current === projectRef.current.meta.updatedAt
			) {
				return;
			}
			autoSaveInFlightRef.current = true;
			const label =
				reason === "manual"
					? "デバッグ保存中…"
					: "自動保存中…";
			setSaveStatus("saving", label);
			try {
				const db = await getDb();
				await db.projects.put({
					id: "project_default",
					data: projectRef.current,
					updatedAt: Date.now(),
				});
				lastSavedVersionRef.current = projectRef.current.meta.updatedAt;
				const doneLabel =
					reason === "manual"
						? "デバッグ保存しました"
						: "自動保存しました";
				setSaveStatus("saved", doneLabel);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: reason === "manual"
						? "デバッグ保存に失敗しました。"
						: "自動保存に失敗しました。";
				setSaveStatus("error", message);
			} finally {
				autoSaveInFlightRef.current = false;
			}
		},
		[setSaveStatus]
	);

	useEffect(() => {
		if (!hasUserEdits) {
			return undefined;
		}
		if (autoSaveTimerRef.current) {
			clearTimeout(autoSaveTimerRef.current);
		}
		autoSaveTimerRef.current = setTimeout(() => {
			void saveProject("auto");
		}, 1200);
		return () => {
			if (autoSaveTimerRef.current) {
				clearTimeout(autoSaveTimerRef.current);
				autoSaveTimerRef.current = null;
			}
		};
	}, [hasUserEdits, project, saveProject]);

	useEffect(() => {
		const intervalId = setInterval(() => {
			if (!hasUserEdits) {
				return;
			}
			void saveProject("interval");
		}, 30000);
		return () => clearInterval(intervalId);
	}, [hasUserEdits, saveProject]);

	useEffect(() => {
		if (manualSaveTick === 0) {
			return undefined;
		}
		void saveProject("manual");
		return undefined;
	}, [manualSaveTick, saveProject]);

	return (
		<div className="flex h-screen flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
			<TopBar onOpenTemplate={() => setTemplateChooserOpen(true)} />
			<div className="flex min-h-0 flex-1">
				<LeftPanel width={leftWidth} onWidthPreset={setLeftWidth} />
				<PreviewPane />
				<aside
					className="ui-panel hidden h-full min-h-0 w-[360px] flex-col border-l border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)] lg:flex"
					style={{ width: RIGHT_PANEL_WIDTH }}
				>
					<InspectorPanel />
				</aside>
			</div>
			{templateChooserOpen ? (
				<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-6">
					<div className="w-full max-w-2xl rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-2">
								<div className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-3 py-1 text-[11px] font-semibold text-[var(--ui-muted)]">
									テンプレート選択
								</div>
								<div className="text-xl font-semibold text-[var(--ui-text)]">
									使いたいテンプレートを選択してください
								</div>
								<div className="text-sm text-[var(--ui-muted)]">
									キャンペーンを選ぶと、今の並びのLPが読み込まれます。
								</div>
							</div>
							{lastTemplate ? (
								<span className="ui-chip h-8 px-3 text-[11px]">
									前回: {lastTemplate.title}
								</span>
							) : null}
						</div>
						<div className="mt-5 grid gap-4 sm:grid-cols-2">
							{TEMPLATE_OPTIONS.map((option) => (
								<button
									key={option.id}
									type="button"
									onClick={() => handleTemplateSelect(option)}
									className="group relative flex h-full flex-col gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] p-5 text-left transition hover:border-[var(--ui-text)] hover:bg-[var(--ui-panel)]"
								>
									<div className="flex items-center justify-between">
										<div className="text-base font-semibold text-[var(--ui-text)]">
											{option.title}
										</div>
										<span className="rounded-full border border-[var(--ui-border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ui-muted)]">
											標準
										</span>
									</div>
									<div className="text-sm text-[var(--ui-muted)]">
										{option.description}
									</div>
									<div className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[var(--ui-text)] px-3 py-1 text-[11px] font-semibold text-[var(--ui-bg)]">
										このテンプレートで開く
									</div>
								</button>
							))}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
