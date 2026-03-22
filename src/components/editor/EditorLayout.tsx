"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import TopBar from "@/src/components/editor/TopBar";
import TooltipLayer from "@/src/components/editor/TooltipLayer";
import { getDb } from "@/src/db/db";
import { createProjectFromTemplate, useEditorStore } from "@/src/store/editorStore";
import {
	TEMPLATE_OPTIONS,
	TEMPLATE_STORAGE_KEY,
} from "@/src/lib/templateOptions";
import { serializeProjectForPersistence } from "@/src/lib/editorProject";
import { isE2ETestModeEnabled, isTemplateDebugEnabled } from "@/src/lib/debugFlags";
import type { TemplateOption } from "@/src/lib/templateOptions";
import { getLayoutSections } from "@/src/lib/editorProject";

const CanvasEditorPage = dynamic(
	() => import("@/src/components/canvas/CanvasEditorPage"),
	{ ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-sm text-[var(--ui-muted)]">Canvas Loading…</div> }
);

const LayoutV2Shell = dynamic(
	() => import("@/src/components/layout-v2/LayoutV2Shell"),
	{ ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-sm text-[var(--ui-muted)]">Layout Loading…</div> }
);

export default function EditorLayout() {
	const router = useRouter();
	const templateDebug = isTemplateDebugEnabled();
	const [templateChooserOpen, setTemplateChooserOpen] = useState(false);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
	const editorMode = useEditorStore((state) => state.project.editorDocuments?.mode ?? "layout");
	const setEditorMode = useEditorStore((state) => state.setEditorMode);
	const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
	const manualSaveTick = useEditorStore((state) => state.manualSaveTick);
	const project = useEditorStore((state) => state.project);
	const hasUserEdits = useEditorStore((state) => state.hasUserEdits);
	const autoSaveIntervalSec = useEditorStore(
		(state) => state.autoSaveIntervalSec
	);
	const saveDestination = useEditorStore((state) => state.saveDestination);
	const setProject = useEditorStore((state) => state.setProject);
	const replaceProject = useEditorStore((state) => state.replaceProject);
	const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
	const setPageBackground = useEditorStore((state) => state.setPageBackground);
	const setSelectedSection = useEditorStore((state) => state.setSelectedSection);
	const projectRef = useRef(project);
	const lastSavedVersionRef = useRef<string | undefined>(
		project.meta.updatedAt
	);
	const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const autoSaveInFlightRef = useRef(false);
	const randomBgAppliedRef = useRef(false);
	const loadAttemptedRef = useRef(false);
	const launchContextAppliedRef = useRef(false);
	const [projectLoadResolved, setProjectLoadResolved] = useState(false);
	const [launchContext, setLaunchContext] = useState<{ mode?: string; sectionId?: string } | null>(null);
	const [isE2ETestMode, setIsE2ETestMode] = useState(false);
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
					if (!isE2ETestMode) {
						setTemplateChooserOpen(true);
					}
					setProjectLoadResolved(true);
					return;
				}
				replaceProject(record.data);
				setSaveStatus("saved", "保存データを読み込みました");
				setTemplateChooserOpen(false);
				setProjectLoadResolved(true);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "保存データの読み込みに失敗しました。";
				setSaveStatus("error", message);
				if (!isE2ETestMode) {
					setTemplateChooserOpen(true);
				} else {
					setTemplateChooserOpen(false);
				}
				setProjectLoadResolved(true);
			}
		};
		void loadProject();
	}, [isE2ETestMode, replaceProject, setSaveStatus]);

	const handleTemplateSelect = (option: TemplateOption) => {
		try {
			if (templateDebug) {
				console.log("[TemplateDebug] 2.handleTemplateSelect called", {
					templateId: option.id,
					templateType: option.templateType,
					sectionOrder: option.sectionOrder,
				});
			}
			window.localStorage.setItem(TEMPLATE_STORAGE_KEY, option.id);
			setSelectedTemplateId(option.id);
			if (templateDebug) {
				console.log("[TemplateDebug] 3.templateKey resolved", option.id);
				console.log("[TemplateDebug] 4.template definition", option);
			}
			const nextProject = createProjectFromTemplate(
				option.id,
				option.title
			);
			const docs = nextProject.editorDocuments;
			if (!docs?.layoutDocument) {
				throw new Error("layoutDocument is missing during template apply");
			}
			const syncedProject: typeof nextProject = {
				...nextProject,
				editorDocuments: {
					...docs,
					mode: "layout",
					layoutDocument: {
						...docs.layoutDocument,
						sections: getLayoutSections(nextProject),
					},
				},
			};
			if (templateDebug) {
				const syncedSections = getLayoutSections(syncedProject);
				console.log("[TemplateDebug] 5.sections generated", {
					sectionsLength: syncedSections.length,
					sectionTypes: syncedSections.map((section) => section.type),
					layoutDocSectionsLength:
						syncedProject.editorDocuments?.layoutDocument?.sections?.length,
				});
				console.log("[TemplateDebug] 6.before setProject");
			}
			setProject(syncedProject);
			if (templateDebug) {
				const after = useEditorStore.getState();
				const afterSections = getLayoutSections(after.project);
				console.log("[TemplateDebug] 7.after setProject", {
					projectSectionsLength: afterSections.length,
					projectSectionTypes: afterSections.map((section) => section.type),
					layoutDocSectionsLength:
						after.project.editorDocuments?.layoutDocument?.sections?.length,
					layoutDocSectionTypes:
						after.project.editorDocuments?.layoutDocument?.sections?.map(
							(section) => section.type
						),
				});
			}
			const syncedSections = getLayoutSections(syncedProject);
			if (syncedSections[0]?.id) {
				setSelectedSection(syncedSections[0].id);
			}
			if (editorMode !== "layout") {
				setEditorMode("layout");
			}
			if (templateDebug) {
				console.log("[TemplateDebug] 9.before modal close", {
					templateChooserOpen,
				});
			}
			setTemplateChooserOpen(false);
		} catch (error) {
			console.error("[TemplateDebug] 10.handleTemplateSelect error", error);
		}
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
			if (saveDestination !== "browser") {
				return;
			}
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
				const normalizedProject = serializeProjectForPersistence(projectRef.current);
				await db.projects.put({
					id: "project_default",
					data: normalizedProject,
					updatedAt: Date.now(),
				});
				lastSavedVersionRef.current = normalizedProject.meta.updatedAt;
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
			[saveDestination, setSaveStatus]
		);

	useEffect(() => {
		if (saveDestination !== "browser") {
			return undefined;
		}
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
	}, [hasUserEdits, project, saveDestination, saveProject]);

	useEffect(() => {
		if (saveDestination !== "browser") {
			return undefined;
		}
		const intervalMs = Math.max(10, autoSaveIntervalSec) * 1000;
		const intervalId = setInterval(() => {
			if (!hasUserEdits) {
				return;
			}
			void saveProject("interval");
		}, intervalMs);
		return () => clearInterval(intervalId);
	}, [autoSaveIntervalSec, hasUserEdits, saveDestination, saveProject]);

	useEffect(() => {
		if (manualSaveTick === 0) {
			return undefined;
		}
		void saveProject("manual");
		return undefined;
	}, [manualSaveTick, saveProject]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const params = new URLSearchParams(window.location.search);
		setIsE2ETestMode(isE2ETestModeEnabled(window.location.search));
		setLaunchContext({
			mode: params.get("mode") ?? undefined,
			sectionId: params.get("sectionId") ?? undefined,
		});
	}, []);

	useEffect(() => {
		if (launchContextAppliedRef.current) {
			return;
		}
		if (!projectLoadResolved) {
			return;
		}
		const requestedMode = launchContext?.mode;
		const requestedSectionId = launchContext?.sectionId;
		if (!requestedMode && !requestedSectionId) {
			launchContextAppliedRef.current = true;
			return;
		}
		if ((requestedMode === "layout" || requestedMode === "canvas") && requestedMode !== editorMode) {
			setEditorMode(requestedMode);
		}
		if (requestedSectionId) {
			const exists = getLayoutSections(project).some((section) => section.id === requestedSectionId);
			if (exists) {
				setSelectedSection(requestedSectionId);
			}
		}
		launchContextAppliedRef.current = true;
	}, [editorMode, launchContext, project, projectLoadResolved, setEditorMode, setSelectedSection]);

	return (
		<div className="lp-editor flex h-screen flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
			<TopBar onOpenTemplate={() => setTemplateChooserOpen(true)} previewIframeRef={previewIframeRef} editorMode={editorMode} />
			{/* ===== Page Mode Switcher ===== */}
			<div className="flex items-center gap-1 border-b border-[var(--ui-border)] bg-[var(--surface-2)] px-3 py-1.5">
				<button
					type="button"
					className={`h-7 rounded px-3 text-[11px] font-semibold transition-colors ${editorMode === "layout" ? "bg-[var(--ui-text)] text-[var(--ui-bg)]" : "text-[var(--ui-text)] hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"}`}
					onClick={() => setEditorMode("layout")}
				>
					Layout
				</button>
				<button
					type="button"
					className={`h-7 rounded px-3 text-[11px] font-semibold transition-colors ${editorMode === "canvas" ? "bg-[var(--ui-text)] text-[var(--ui-bg)]" : "text-[var(--ui-text)] hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"}`}
					onClick={() => setEditorMode("canvas")}
				>
					Canvas
				</button>
				<button
					type="button"
					className="h-7 rounded px-3 text-[11px] font-semibold text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
					onClick={() => {
						const params = new URLSearchParams();
						params.set("source", "mode");
						params.set("returnTo", `/editor?mode=${editorMode}`);
						router.push(`/creative?${params.toString()}`);
					}}
				>
					AI
				</button>
				<button
					type="button"
					className="h-7 rounded px-3 text-[11px] font-semibold text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
					onClick={() => router.push("/campaign")}
				>
					Campaign
				</button>
			</div>

			{editorMode === "layout" ? (
				<LayoutV2Shell previewIframeRef={previewIframeRef} />
			) : (
				<div className="min-h-0 flex-1">
					<CanvasEditorPage />
				</div>
			)}
			<footer className="flex items-center justify-center border-t border-[var(--ui-border)] bg-[var(--surface-2)] px-4 py-2 text-xs text-[var(--ui-muted)]">
				AURBIT - LP Editor / Created By Jhastine.K
			</footer>
			<TooltipLayer />
			{templateChooserOpen && !isE2ETestMode ? (
				<div className="absolute inset-0 z-50 ui-modal-overlay flex items-center justify-center p-6">
					<div className="ui-modal w-full max-w-2xl p-6">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-2">
								<div className="inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold text-[var(--ui-muted)]">
									テンプレート選択
								</div>
								<div className="text-xl font-semibold text-[var(--ui-text)]">
									使いたいテンプレートを選択してください
								</div>
								<div className="text-sm text-[var(--ui-muted)]">
									テンプレートを選ぶと、必要なセクションが読み込まれます。
								</div>
							</div>
							<div className="flex items-center gap-2">
								{lastTemplate ? (
									<span className="ui-chip h-8 px-3 text-[11px]">
										前回: {lastTemplate.title}
									</span>
								) : null}
								<button
									type="button"
									className="ui-button ui-button-secondary h-8 px-3 text-[11px]"
									onClick={() => setTemplateChooserOpen(false)}
								>
									編集画面に戻る
								</button>
							</div>
						</div>
						<div className="mt-5 grid gap-4 sm:grid-cols-2">
							{TEMPLATE_OPTIONS.map((option) => (
								<button
									key={option.id}
									type="button"
									onClick={(event) => {
										if (templateDebug) {
											console.log("[TemplateDebug] 1.template card onClick", {
												templateId: option.id,
												disabled: (event.currentTarget as HTMLButtonElement).disabled,
												targetTag: (event.target as HTMLElement).tagName,
											});
										}
										handleTemplateSelect(option);
									}}
									className="group relative flex h-full flex-col gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--surface)] p-5 text-left transition-colors duration-150 ease-out hover:border-[var(--ui-text)] hover:bg-[var(--surface-2)]"
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

