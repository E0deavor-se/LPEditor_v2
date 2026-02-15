"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LeftPanel from "@/src/components/editor/LeftPanel";
import PreviewPane from "@/src/components/editor/PreviewPane";
import TopBar from "@/src/components/editor/TopBar";
import InspectorPanel from "@/src/components/editor/right/InspectorPanel";
import { getDb } from "@/src/db/db";
import { useEditorStore } from "@/src/store/editorStore";

const RIGHT_PANEL_WIDTH = 360;

export default function EditorLayout() {
	const [leftWidth, setLeftWidth] = useState(320);
	const manualSaveTick = useEditorStore((state) => state.manualSaveTick);
	const project = useEditorStore((state) => state.project);
	const hasUserEdits = useEditorStore((state) => state.hasUserEdits);
	const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
	const setPageBackground = useEditorStore((state) => state.setPageBackground);
	const projectRef = useRef(project);
	const lastSavedVersionRef = useRef<string | undefined>(
		project.meta.updatedAt
	);
	const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const autoSaveInFlightRef = useRef(false);
	const randomBgAppliedRef = useRef(false);

	useEffect(() => {
		projectRef.current = project;
	}, [project]);

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
			<TopBar />
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
		</div>
	);
}
