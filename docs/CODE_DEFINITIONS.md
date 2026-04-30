# DFK Defender Code Definitions

This file indexes the code in this build so we can identify bloat and plan refactors without changing behavior first.

No gameplay code was changed for this pass. This zip only adds documentation under `/docs`.

Generated: 2026-04-28 22:02 UTC
Files indexed: 9
Items indexed: 3901

## Summary by file

- `index.html` — 303 items (HTML element: 303)
- `js/app.js` — 1365 items (arrow function: 21, constant/table: 226, event listener: 112, function: 1006)
- `js/avax-rails.js` — 88 items (arrow function: 1, constant/table: 3, event listener: 14, function: 70)
- `js/layout-fixes.js` — 3 items (event listener: 1, function: 2)
- `js/leaderboard-flyout.js` — 54 items (event listener: 14, function: 40)
- `js/multi-chain-rails.js` — 12 items (constant/table: 2, event listener: 3, function: 7)
- `js/run-tracker.js` — 97 items (constant/table: 5, event listener: 10, function: 82)
- `js/security-wallet.js` — 60 items (arrow function: 1, constant/table: 8, event listener: 4, function: 47)
- `styles.css` — 1919 items (CSS block: 97, CSS selector: 1822)

## `index.html`

### Html Elements

- **L228 `#mobileRotatePrompt <div>`** — Named UI/DOM element.
- **L235 `#app <div>`** — Named UI/DOM element.
- **L236 `.main-layout <main>`** — Named UI/DOM element.
- **L237 `#runLogPanel <section>`** — Named UI/DOM element.
- **L238 `#runLogHeader <div>`** — Named UI/DOM element.
- **L239 `#runLogToggleBtn <button>`** — Named UI/DOM element.
- **L241 `#avaxTreasuryPanel <aside>`** — Named UI/DOM element.
- **L247 `#avaxTreasuryPanelCloseBtn <button>`** — Named UI/DOM element.
- **L249 `#avaxTreasuryPanelBody <div>`** — Named UI/DOM element.
- **L250 `#avaxTreasuryTotal <div>`** — Named UI/DOM element.
- **L251 `#avaxTreasuryToday <div>`** — Named UI/DOM element.
- **L252 `#avaxTreasuryBreakdown <div>`** — Named UI/DOM element.
- **L253 `#avaxTreasuryTxCount <div>`** — Named UI/DOM element.
- **L254 `#rewardClaimsAdminSection <div>`** — Named UI/DOM element.
- **L255 `#rewardClaimsAdminHeader <div>`** — Named UI/DOM element.
- **L258 `#rewardClaimsAdminStatus <div>`** — Named UI/DOM element.
- **L260 `#refreshTreasuryViewBtn <button>`** — Named UI/DOM element.
- **L262 `#rewardClaimsWhitelistSection <div>`** — Named UI/DOM element.
- **L265 `#rewardWhitelistWalletInput <input>`** — Named UI/DOM element.
- **L266 `#rewardWhitelistActiveInput <input>`** — Named UI/DOM element.
- **L267 `#rewardWhitelistDailyInput <input>`** — Named UI/DOM element.
- **L268 `#rewardWhitelistBountyInput <input>`** — Named UI/DOM element.
- **L269 `#rewardWhitelistMaxClaimInput <input>`** — Named UI/DOM element.
- **L270 `#rewardWhitelistDailyCapInput <input>`** — Named UI/DOM element.
- **L271 `#rewardWhitelistNotesInput <input>`** — Named UI/DOM element.
- **L272 `#saveRewardWhitelistBtn <button>`** — Named UI/DOM element.
- **L274 `#rewardClaimsWhitelistList <div>`** — Named UI/DOM element.
- **L276 `#rewardClaimsAdminBody <div>`** — Named UI/DOM element.
- **L280 `#walletTopBalances <div>`** — Named UI/DOM element.
- **L282 `#walletTopJewelBalance <div>`** — Named UI/DOM element.
- **L283 `#walletTopRefreshBtn <button>`** — Named UI/DOM element.
- **L285 `#walletTopDfkgoldBalance <div>`** — Named UI/DOM element.
- **L286 `#walletTopHonkBalance <div>`** — Named UI/DOM element.
- **L287 `#walletTopTrackingSummary <div>`** — Named UI/DOM element.
- **L288 `#walletTopClaimedToday <div>`** — Named UI/DOM element.
- **L289 `#walletTopResetTimer <div>`** — Named UI/DOM element.
- **L291 `#buttonsPanel <div>`** — Named UI/DOM element.
- **L292 `#buttonsPanelToggle <button>`** — Named UI/DOM element.
- **L298 `#buttonsPanelBody <div>`** — Named UI/DOM element.
- **L299 `#questsBtn <button>`** — Named UI/DOM element.
- **L300 `#knownRelicsBtn <button>`** — Named UI/DOM element.
- **L301 `#leaderboardFlyoutBtn <button>`** — Named UI/DOM element.
- **L302 `#introBtn <button>`** — Named UI/DOM element.
- **L303 `#trackedRunsBtn <button>`** — Named UI/DOM element.
- **L304 `#transferHeroesBtn <button>`** — Named UI/DOM element.
- **L305 `#treasuryFlyoutBtn <button>`** — Named UI/DOM element.
- **L306 `#loreBtn <button>`** — Named UI/DOM element.
- **L307 `#bountyBtn <button>`** — Named UI/DOM element.
- **L310 `#replayPanel <div>`** — Named UI/DOM element.
- **L311 `#replayPanelToggle <button>`** — Named UI/DOM element.
- **L317 `#replayPanelBody <div>`** — Named UI/DOM element.
- **L318 `#replayPanelWarning <div>`** — Named UI/DOM element.
- **L319 `#replayPanelMeta <div>`** — Named UI/DOM element.
- **L321 `#replayPanelPrevBtn <button>`** — Named UI/DOM element.
- **L322 `#replayPanelPlayPauseBtn <button>`** — Named UI/DOM element.
- **L323 `#replayPanelNextBtn <button>`** — Named UI/DOM element.
- **L324 `#replayPanelCopyLinkBtn <button>`** — Named UI/DOM element.
- **L326 `#replayPanelStepLabel <div>`** — Named UI/DOM element.
- **L327 `#replayPanelEvents <div>`** — Named UI/DOM element.
- **L330 `#walletPanel <div>`** — Named UI/DOM element.
- **L331 `#walletPanelToggle <button>`** — Named UI/DOM element.
- **L333 `#walletPanelTitle <span>`** — Named UI/DOM element.
- **L334 `#walletStatus <span>`** — Named UI/DOM element.
- **L338 `#walletPanelBody <div>`** — Named UI/DOM element.
- **L339 `#walletProfileName <div>`** — Named UI/DOM element.
- **L340 `#walletJewelBalance <div>`** — Named UI/DOM element.
- **L341 `#walletDfkgoldBalance <div>`** — Named UI/DOM element.
- **L342 `#walletHonkBalance <div>`** — Named UI/DOM element.
- **L343 `#walletAddress <div>`** — Named UI/DOM element.
- **L344 `#walletTrackingStatus <div>`** — Named UI/DOM element.
- **L345 `#walletTrackingSummary <div>`** — Named UI/DOM element.
- **L346 `#walletVanitySection <div>`** — Named UI/DOM element.
- **L348 `#walletVanityInput <input>`** — Named UI/DOM element.
- **L349 `#saveVanityBtn <button>`** — Named UI/DOM element.
- **L351 `#walletVanityStatus <div>`** — Named UI/DOM element.
- **L354 `#connectWalletBtn <button>`** — Named UI/DOM element.
- **L355 `#disconnectWalletBtn <button>`** — Named UI/DOM element.
- **L357 `#enableTrackingBtn <button>`** — Named UI/DOM element.
- **L358 `#disableTrackingBtn <button>`** — Named UI/DOM element.
- **L359 `#clearStuckWavesBtn <button>`** — Named UI/DOM element.
- **L360 `#addGoldBtn <button>`** — Named UI/DOM element.
- **L361 `#championFastModeBtn <button>`** — Named UI/DOM element.
- **L362 `#metisInfluenceDebugBtn <button>`** — Named UI/DOM element.
- **L365 `#walletHeroBonusSection <div>`** — Named UI/DOM element.
- **L366 `#walletHeroBonusToggle <button>`** — Named UI/DOM element.
- **L369 `#walletHeroBonusSummary <span>`** — Named UI/DOM element.
- **L373 `#walletHeroBonusPanelBody <div>`** — Named UI/DOM element.
- **L375 `#refreshWalletHeroesBtn <button>`** — Named UI/DOM element.
- **L376 `#closeWalletHeroesModalBtn <button>`** — Named UI/DOM element.
- **L378 `#walletHeroBonusStatus <div>`** — Named UI/DOM element.
- **L379 `#walletHeroBonusBody <div>`** — Named UI/DOM element.
- **L381 `#championPanel <div>`** — Named UI/DOM element.
- **L382 `#championPanelToggle <button>`** — Named UI/DOM element.
- **L385 `#championPanelSummary <span>`** — Named UI/DOM element.
- **L389 `#championPanelBody <div>`** — Named UI/DOM element.
- **L391 `#refreshChampionsBtn <button>`** — Named UI/DOM element.
- **L392 `#chooseChampionBtn <button>`** — Named UI/DOM element.
- **L393 `#deployChampionBtn <button>`** — Named UI/DOM element.
- **L395 `#championStatus <div>`** — Named UI/DOM element.
- **L396 `#championBody <div>`** — Named UI/DOM element.
- **L402 `#log <div>`** — Named UI/DOM element.
- **L404 `.center-panel.panel <section>`** — Named UI/DOM element.
- **L405 `#banner <div>`** — Named UI/DOM element.
- **L406 `#grid <div>`** — Named UI/DOM element.
- **L407 `#instructionText <span>`** — Named UI/DOM element.
- **L407 `#phaseLabel <span>`** — Named UI/DOM element.
- **L407 `#statusOverlay <div>`** — Named UI/DOM element.
- **L408 `.bottom-panel.panel <footer>`** — Named UI/DOM element.
- **L410 `#startWaveStack <div>`** — Named UI/DOM element.
- **L411 `#startWaveBtn <button>`** — Named UI/DOM element.
- **L412 `#startWaveBonusIndicator <div>`** — Named UI/DOM element.
- **L414 `#autoStartBtn <button>`** — Named UI/DOM element.
- **L415 `#skipSetupBtn <button>`** — Named UI/DOM element.
- **L416 `#restartBtn <button>`** — Named UI/DOM element.
- **L418 `#portalHp <span>`** — Named UI/DOM element.
- **L419 `#jewelCount <span>`** — Named UI/DOM element.
- **L420 `#waveCount <span>`** — Named UI/DOM element.
- **L422 `#patternLabel <span>`** — Named UI/DOM element.
- **L423 `#mutationLabel <span>`** — Named UI/DOM element.
- **L424 `#countdownLabel <span>`** — Named UI/DOM element.
- **L425 `#runLogTitle <span>`** — Named UI/DOM element.
- **L431 `#hirePanel <div>`** — Named UI/DOM element.
- **L438 `#relicViewDfkgoldSwapBtn <button>`** — Named UI/DOM element.
- **L439 `#relicViewJewelGoldSwapBtn <button>`** — Named UI/DOM element.
- **L440 `#relicViewHonkGoldSwapBtn <button>`** — Named UI/DOM element.
- **L442 `#relicSwapStatus <div>`** — Named UI/DOM element.
- **L444 `#relicPanel <div>`** — Named UI/DOM element.
- **L449 `#infoPanel <section>`** — Named UI/DOM element.
- **L451 `#burnedGoldDisplay <div>`** — Named UI/DOM element.
- **L451 `#dailyRaffleWinnerDisplay <div>`** — Named UI/DOM element.
- **L451 `#totalRunsDisplay <div>`** — Named UI/DOM element.
- **L453 `#heroQuickSelect <div>`** — Named UI/DOM element.
- **L454 `#selectedInfo <div>`** — Named UI/DOM element.
- **L456 `#upgradeBtn <button>`** — Named UI/DOM element.
- **L457 `#moveBtn <button>`** — Named UI/DOM element.
- **L458 `#cancelActionBtn <button>`** — Named UI/DOM element.
- **L459 `#maxLevelBtn <button>`** — Named UI/DOM element.
- **L460 `#rebuildBarriersBtn <button>`** — Named UI/DOM element.
- **L462 `#abilitiesPanel <div>`** — Named UI/DOM element.
- **L465 `#heroPlacementReminderModal <div>`** — Named UI/DOM element.
- **L470 `#heroPlacementReminderTitle <h2>`** — Named UI/DOM element.
- **L473 `#heroPlacementReminderBody <div>`** — Named UI/DOM element.
- **L475 `#heroPlacementReminderOkBtn <button>`** — Named UI/DOM element.
- **L482 `#relicModal <div>`** — Named UI/DOM element.
- **L485 `#relicModalBody <div>`** — Named UI/DOM element.
- **L488 `#transferHeroesModal <div>`** — Named UI/DOM element.
- **L493 `#transferHeroesTitle <h2>`** — Named UI/DOM element.
- **L495 `#closeTransferHeroesBtn <button>`** — Named UI/DOM element.
- **L500 `#transferHeroesRecipient <input>`** — Named UI/DOM element.
- **L504 `#transferHeroesSearch <input>`** — Named UI/DOM element.
- **L508 `#transferHeroesSort <select>`** — Named UI/DOM element.
- **L517 `#transferHeroesSelectAllBtn <button>`** — Named UI/DOM element.
- **L518 `#transferHeroesClearBtn <button>`** — Named UI/DOM element.
- **L519 `#transferHeroesSummary <div>`** — Named UI/DOM element.
- **L521 `#transferHeroesStatus <div>`** — Named UI/DOM element.
- **L522 `#transferHeroesPaginationTop <div>`** — Named UI/DOM element.
- **L523 `#transferHeroesPrevBtn <button>`** — Named UI/DOM element.
- **L524 `#transferHeroesPageLabel <div>`** — Named UI/DOM element.
- **L525 `#transferHeroesNextBtn <button>`** — Named UI/DOM element.
- **L527 `#transferHeroesBody <div>`** — Named UI/DOM element.
- **L529 `#confirmTransferHeroesBtn <button>`** — Named UI/DOM element.
- **L533 `#introModal <div>`** — Named UI/DOM element.
- **L537 `#introKicker <div>`** — Named UI/DOM element.
- **L538 `#introTitle <h2>`** — Named UI/DOM element.
- **L540 `#closeIntroBtn <button>`** — Named UI/DOM element.
- **L542 `#guideIntroToggleBtn <button>`** — Named UI/DOM element.
- **L542 `#guideLoreToggleBtn <button>`** — Named UI/DOM element.
- **L542 `#guideModeToggle <div>`** — Named UI/DOM element.
- **L542 `#introBody <div>`** — Named UI/DOM element.
- **L544 `#introPrevBtn <button>`** — Named UI/DOM element.
- **L545 `#introPageLabel <div>`** — Named UI/DOM element.
- **L546 `#introNextBtn <button>`** — Named UI/DOM element.
- **L550 `#startModeModal <div>`** — Named UI/DOM element.
- **L555 `#startModeTitle <h2>`** — Named UI/DOM element.
- **L557 `#closeStartModeBtn <button>`** — Named UI/DOM element.
- **L562 `#startModeNote <div>`** — Named UI/DOM element.
- **L565 `#guestModeChoiceBtn <button>`** — Named UI/DOM element.
- **L566 `#connectModeChoiceBtn <button>`** — Named UI/DOM element.
- **L570 `#guestConnectConfirmModal <div>`** — Named UI/DOM element.
- **L575 `#guestConnectConfirmTitle <h2>`** — Named UI/DOM element.
- **L577 `#closeGuestConnectConfirmBtn <button>`** — Named UI/DOM element.
- **L583 `#guestConnectStayBtn <button>`** — Named UI/DOM element.
- **L584 `#guestConnectConfirmBtn <button>`** — Named UI/DOM element.
- **L588 `#seerIntroModal <div>`** — Named UI/DOM element.
- **L593 `#seerIntroTitle <h2>`** — Named UI/DOM element.
- **L595 `#closeSeerIntroBtn <button>`** — Named UI/DOM element.
- **L628 `#seerIntroLearnMoreBtn <button>`** — Named UI/DOM element.
- **L629 `#seerIntroOkBtn <button>`** — Named UI/DOM element.
- **L633 `#championModal <div>`** — Named UI/DOM element.
- **L638 `#championModalTitle <h2>`** — Named UI/DOM element.
- **L642 `#championModalText <p>`** — Named UI/DOM element.
- **L643 `#championModalBody <div>`** — Named UI/DOM element.
- **L646 `#championConfirmBtn <button>`** — Named UI/DOM element.
- **L650 `#championLockModal <div>`** — Named UI/DOM element.
- **L655 `#championLockTitle <h2>`** — Named UI/DOM element.
- **L659 `#championLockText <p>`** — Named UI/DOM element.
- **L662 `#championLockCancelBtn <button>`** — Named UI/DOM element.
- **L663 `#championLockConfirmBtn <button>`** — Named UI/DOM element.
- **L667 `#bountyModal <div>`** — Named UI/DOM element.
- **L672 `#bountyTitle <h2>`** — Named UI/DOM element.
- **L674 `#closeBountyBtn <button>`** — Named UI/DOM element.
- **L676 `#bountyBody <div>`** — Named UI/DOM element.
- **L679 `#questsModal <div>`** — Named UI/DOM element.
- **L684 `#questsTitle <h2>`** — Named UI/DOM element.
- **L686 `#closeQuestsBtn <button>`** — Named UI/DOM element.
- **L688 `#questBountyToggleBtn <button>`** — Named UI/DOM element.
- **L688 `#questDailyToggleBtn <button>`** — Named UI/DOM element.
- **L688 `#questModeToggle <div>`** — Named UI/DOM element.
- **L688 `#questsBody <div>`** — Named UI/DOM element.
- **L691 `#trackedRunsModal <div>`** — Named UI/DOM element.
- **L696 `#trackedRunsTitle <h2>`** — Named UI/DOM element.
- **L698 `#closeTrackedRunsBtn <button>`** — Named UI/DOM element.
- **L700 `#trackedRunsBody <div>`** — Named UI/DOM element.
- **L703 `#knownRelicsModal <div>`** — Named UI/DOM element.
- **L708 `#knownRelicsTitle <h2>`** — Named UI/DOM element.
- **L710 `#closeKnownRelicsBtn <button>`** — Named UI/DOM element.
- **L712 `#knownRelicsBody <div>`** — Named UI/DOM element.
- **L715 `#eliteWaveModal <div>`** — Named UI/DOM element.
- **L720 `#eliteWaveTitle <h2>`** — Named UI/DOM element.
- **L723 `#eliteWaveBody <div>`** — Named UI/DOM element.
- **L725 `#eliteWaveOkBtn <button>`** — Named UI/DOM element.
- **L729 `#continueOfferModal <div>`** — Named UI/DOM element.
- **L733 `#continueOfferTitle <h2>`** — Named UI/DOM element.
- **L736 `#continueOfferBody <div>`** — Named UI/DOM element.
- **L740 `#continueHellYeahBtn <button>`** — Named UI/DOM element.
- **L741 `#continuePaidJewelBtn <button>`** — Named UI/DOM element.
- **L742 `#continuePaidHonkBtn <button>`** — Named UI/DOM element.
- **L743 `#continueNoThanksBtn <button>`** — Named UI/DOM element.
- **L747 `#mobileHud <div>`** — Named UI/DOM element.
- **L748 `#mobileSideMenuToggleBtn <button>`** — Named UI/DOM element.
- **L749 `#mobileLeftRail <div>`** — Named UI/DOM element.
- **L750 `#mobileBankHost <div>`** — Named UI/DOM element.
- **L751 `#mobileProfileHost <div>`** — Named UI/DOM element.
- **L753 `#mobileRightMenuToggleBtn <button>`** — Named UI/DOM element.
- **L754 `#mobileRightRail <div>`** — Named UI/DOM element.
- **L755 `#mobileStatsPanel <div>`** — Named UI/DOM element.
- **L756 `#mobileStatsPanelToggle <button>`** — Named UI/DOM element.
- **L760 `#mobileStatsPanelBody <div>`** — Named UI/DOM element.
- **L761 `#mobileStatsHost <div>`** — Named UI/DOM element.
- **L765 `#mobileInstallPrompt <div>`** — Named UI/DOM element.
- **L766 `#mobileInstallText <div>`** — Named UI/DOM element.
- **L768 `#mobileInstallBtn <button>`** — Named UI/DOM element.
- **L769 `#mobileInstallDismissBtn <button>`** — Named UI/DOM element.
- **L772 `#mobileMenuOverlay <button>`** — Named UI/DOM element.
- **L773 `#mobileMenuShell <div>`** — Named UI/DOM element.
- **L774 `#mobileFuncMenu <div>`** — Named UI/DOM element.
- **L778 `#mobileFuncIntroBtn <button>`** — Named UI/DOM element.
- **L779 `#mobileFuncBountyBtn <button>`** — Named UI/DOM element.
- **L780 `#mobileFuncQuestsBtn <button>`** — Named UI/DOM element.
- **L781 `#mobileFuncKnownRelicsBtn <button>`** — Named UI/DOM element.
- **L782 `#mobileFuncStartBtn <button>`** — Named UI/DOM element.
- **L783 `#mobileFuncSkipBtn <button>`** — Named UI/DOM element.
- **L784 `#mobileFuncRestartBtn <button>`** — Named UI/DOM element.
- **L787 `#mobileHeroMenu <div>`** — Named UI/DOM element.
- **L789 `#mobileHeroHost <div>`** — Named UI/DOM element.
- **L791 `#mobileHireMenu <div>`** — Named UI/DOM element.
- **L793 `#mobileHireHost <div>`** — Named UI/DOM element.
- **L796 `#mobileFlyoutStack <div>`** — Named UI/DOM element.
- **L797 `#mobileHireMenuBtn <button>`** — Named UI/DOM element.
- **L801 `#mobileFuncMenuBtn <button>`** — Named UI/DOM element.
- **L805 `#mobileHeroMenuBtn <button>`** — Named UI/DOM element.
- **L810 `#mobileQuickRail <div>`** — Named UI/DOM element.
- **L811 `#mobileQuickStatus <div>`** — Named UI/DOM element.
- **L814 `#mobileGoldCount <span>`** — Named UI/DOM element.
- **L818 `#mobilePortalHp <span>`** — Named UI/DOM element.
- **L821 `#mobileQuickStartBtn <button>`** — Named UI/DOM element.
- **L822 `#mobileQuickUpgradeBtn <button>`** — Named UI/DOM element.
- **L823 `#mobileQuickSatelliteBtn <button>`** — Named UI/DOM element.
- **L824 `#mobileQuickCancelBtn <button>`** — Named UI/DOM element.
- **L825 `#mobileQuickMoveBtn <button>`** — Named UI/DOM element.
- **L826 `#mobileBottomBar <div>`** — Named UI/DOM element.
- **L827 `#mobileAbilityBtn1 <button>`** — Named UI/DOM element.
- **L828 `#mobileAbilityBtn2 <button>`** — Named UI/DOM element.
- **L829 `#mobileAbilityBtn3 <button>`** — Named UI/DOM element.
- **L830 `#mobileAbilityBtn4 <button>`** — Named UI/DOM element.
- **L833 `#mobileBarToggleBtn <button>`** — Named UI/DOM element.
- **L835 `#mobileBarToggleNotice <span>`** — Named UI/DOM element.
- **L839 `#treasuryFlyoutBackdrop <div>`** — Named UI/DOM element.
- **L840 `#leaderboardBackdrop <div>`** — Named UI/DOM element.
- **L841 `#leaderboardFlyout <aside>`** — Named UI/DOM element.
- **L847 `#leaderboardCloseBtn <button>`** — Named UI/DOM element.
- **L851 `#leaderboardCurrentWeekBtn <button>`** — Named UI/DOM element.
- **L852 `#leaderboardLastWeekBtn <button>`** — Named UI/DOM element.
- **L853 `#leaderboardCurrentDayBtn <button>`** — Named UI/DOM element.
- **L854 `#leaderboardAvaxRaffleBtn <button>`** — Named UI/DOM element.
- **L855 `#leaderboardRefreshBtn <button>`** — Named UI/DOM element.
- **L858 `#leaderboardRangeCopy <div>`** — Named UI/DOM element.
- **L862 `#leaderboardStartDate <input>`** — Named UI/DOM element.
- **L866 `#leaderboardEndDate <input>`** — Named UI/DOM element.
- **L868 `#leaderboardApplyRangeBtn <button>`** — Named UI/DOM element.
- **L870 `#leaderboardRangeDisplay <div>`** — Named UI/DOM element.
- **L873 `#leaderboardStatus <div>`** — Named UI/DOM element.
- **L885 `#leaderboardRaffleHeader <th>`** — Named UI/DOM element.
- **L888 `#leaderboardTableBody <tbody>`** — Named UI/DOM element.
- **L943 `#versionBadge <div>`** — Named UI/DOM element.
- **L944 `#storyOverlay <div>`** — Named UI/DOM element.
- **L946 `#storyMuteBtn <button>`** — Named UI/DOM element.
- **L949 `#storyVolumeSlider <input>`** — Named UI/DOM element.
- **L950 `#storyVolumeValue <span>`** — Named UI/DOM element.
- **L952 `#storyPrevBtn <button>`** — Named UI/DOM element.
- **L953 `#storyNextBtn <button>`** — Named UI/DOM element.
- **L954 `#storySkipBtn <button>`** — Named UI/DOM element.
- **L956 `#storyText <div>`** — Named UI/DOM element.

## `js/app.js`

### Arrow Functions

- **L76 `INITIAL_REPLAY_SHARE_ID`** — Initial replay share id.
- **L99 `attempt`** — Attempt.
- **L112 `retryOnce`** — Retry once.
- **L120 `retryWhenVisible`** — Retry when visible.
- **L395 `zoomFrame`** — Zoom frame.
- **L450 `onVolumeInput`** — On volume input.
- **L2229 `pickOne`** — Pick one.
- **L2862 `bindModal`** — Bind modal.
- **L2866 `swallow`** — Swallow.
- **L11493 `appendStackedBuffBadge`** — Append stacked buff badge.
- **L12179 `clearTimers`** — Clear timers.
- **L12185 `startHold`** — Start hold.
- **L12614 `infoText`** — Info text.
- **L14724 `occupantTower`** — Occupant tower.
- **L15783 `finish`** — Finish.
- **L19685 `pushUnique`** — Push unique.
- **L20074 `eatBackdropEvent`** — Eat backdrop event.
- **L20081 `stopCardBubble`** — Stop card bubble.
- **L20098 `claimHowToPlayFocus`** — Claim how to play focus.
- **L20203 `handleResetWalletInputChange`** — Handle reset wallet input change.
- **L20495 `rerenderPortalArtOnLayoutChange`** — Rerender portal art on layout change.
### Constant/Tables

- **L63 `STORY_SCREENS`** — Story screens.
- **L75 `STORY_MUSIC_SRC`** — Story music src.
- **L76 `INITIAL_REPLAY_SHARE_ID`** — Initial replay share id.
- **L87 `STORY_MUSIC_START_SECONDS`** — Story music start seconds.
- **L88 `STORY_MUSIC_VOLUME`** — Story music volume.
- **L528 `WIDTH`** — Width.
- **L529 `HEIGHT`** — Height.
- **L535 `LANE_NAMES`** — Lane names.
- **L536 `DIRECTIONS`** — Directions.
- **L542 `SETUP_PHASES`** — Setup phases.
- **L550 `RELIC_RARITY_META`** — Relic rarity meta.
- **L556 `RARITIES`** — Rarities.
- **L557 `PRIVATE_ADMIN_WALLETS`** — Private admin wallets.
- **L560 `TEST_GOLD_ADMIN_WALLETS`** — Test gold admin wallets.
- **L563 `LIVE_DAMAGE_REPORT_WALLETS`** — Live damage report wallets.
- **L566 `TEST_GOLD_GRANT_AMOUNT`** — Test gold grant amount.
- **L567 `DAILY_QUEST_TEST_RESET_WALLET`** — Daily quest test reset wallet.
- **L568 `BOUNTY_PROGRESS_TEST_RESET_WALLET`** — Bounty progress test reset wallet.
- **L569 `CHAMPION_FAST_MODE_STORAGE_KEY`** — Champion fast mode storage key.
- **L570 `HIRE_COSTS`** — Hire costs.
- **L571 `MAX_STANDARD_HEROES_ON_BOARD`** — Max standard heroes on board.
- **L572 `UPGRADE_COST_MULTIPLIER`** — Upgrade cost multiplier.
- **L573 `ARCHER_BASE_ATTACK_INTERVAL`** — Archer base attack interval.
- **L574 `ARCHER_HP_LEVEL_MULTIPLIER`** — Archer hp level multiplier.
- **L575 `ARCHER_BASE_HP_MULTIPLIER`** — Archer base hp multiplier.
- **L576 `ARCHER_ATTACK_SPEED_GROWTH_PER_LEVEL`** — Archer attack speed growth per level.
- **L577 `PIRATE_ATTACK_SPEED_GROWTH_PER_LEVEL`** — Pirate attack speed growth per level.
- **L578 `WIZARD_ATTACK_SPEED_GROWTH_PER_LEVEL`** — Wizard attack speed growth per level.
- **L579 `REDUCED_DAMAGE_GROWTH_FACTOR`** — Reduced damage growth factor.
- **L580 `ARCHER_DAMAGE_GROWTH_PER_LEVEL`** — Archer damage growth per level.
- **L581 `PIRATE_WIZARD_DAMAGE_GROWTH_PER_LEVEL`** — Pirate wizard damage growth per level.
- **L582 `MONK_BERSERKER_DAMAGE_GROWTH_PER_LEVEL`** — Monk berserker damage growth per level.
- **L583 `ICE_AURA_BASE_SLOW`** — Ice aura base slow.
- **L584 `ICE_AURA_SLOW_PER_LEVEL`** — Ice aura slow per level.
- **L585 `FIREBOLT_BURN_TOTAL_HEALTH_PERCENT`** — Firebolt burn total health percent.
- **L586 `FIREBOLT_BURN_DURATION_SECONDS`** — Firebolt burn duration seconds.
- **L587 `FIREBOLT_BURN_ICE_AURA_SLOW_BONUS`** — Firebolt burn ice aura slow bonus.
- **L588 `APP_VERSION`** — App version.
- **L589 `CURRENT_RUN_BUILD`** — Current run build.
- **L590 `REPLAY_STORAGE_VERSION`** — Replay storage version.
- **L591 `SOUL_SPLIT_EXPLOSION_MULTIPLIER`** — Soul split explosion multiplier.
- **L592 `SOUL_SPLIT_CHARGE_WAVE_INTERVAL`** — Soul split charge wave interval.
- **L593 `ICE_AURA_BASE_RANGE`** — Ice aura base range.
- **L594 `ICE_AURA_BONUS_RANGE_AT_LEVEL_15`** — Ice aura bonus range at level 15.
- **L595 `SLOW_TOTEM_RANGE`** — Slow totem range.
- **L596 `SLOW_TOTEM_PERCENT`** — Slow totem percent.
- **L597 `STARBOARD_CANNONS_BASE_DAMAGE`** — Starboard cannons base damage.
- **L598 `ABILITY_DAMAGE_PER_LEVEL`** — Ability damage per level.
- **L599 `PRAYER_OF_HEALING_HEAL_PERCENT`** — Prayer of healing heal percent.
- **L600 `SEER_PASSIVE_HEAL_PERCENT_BASE`** — Seer passive heal percent base.
- **L601 `SEER_PASSIVE_HEAL_PERCENT_LEVEL20`** — Seer passive heal percent level20.
- **L602 `SEER_PASSIVE_HEAL_INTERVAL_MS`** — Seer passive heal interval ms.
- **L603 `SAGE_GLOW_HEAL_INTERVAL_MS`** — Sage glow heal interval ms.
- **L604 `SAGE_GLOW_HEAL_PERCENT`** — Sage glow heal percent.
- **L605 `WARSTONE_BASE_DAMAGE`** — Warstone base damage.
- **L606 `CHRONO_PURGE_BASE_DAMAGE`** — Chrono purge base damage.
- **L607 `CHRONO_PURGE_DAMAGE_BONUS_PER_LEVEL`** — Chrono purge damage bonus per level.
- **L608 `CHRONO_PURGE_BONUS_DAMAGE_TAKEN`** — Chrono purge bonus damage taken.
- **L609 `CHRONO_PURGE_DURATION_SECONDS`** — Chrono purge duration seconds.
- **L610 `SEER_EVASION_CHANCE`** — Seer evasion chance.
- **L611 `KRAKEN_BASE_DAMAGE`** — Kraken base damage.
- **L612 `KRAKEN_SLOW_PERCENT`** — Kraken slow percent.
- **L613 `KRAKEN_DURATION_SECONDS`** — Kraken duration seconds.
- **L614 `KRAKEN_RANGE_BONUS`** — Kraken range bonus.
- **L615 `BLINDING_LIGHT_TOTEM_RANGE`** — Blinding light totem range.
- **L616 `BLINDING_LIGHT_TOTEM_SLOW_PERCENT`** — Blinding light totem slow percent.
- **L617 `BLINDING_LIGHT_TOTEM_ATTACK_SLOW_PERCENT`** — Blinding light totem attack slow percent.
- **L618 `BLINDING_LIGHT_TOTEM_DURATION_WAVES`** — Blinding light totem duration waves.
- **L619 `BLINDING_LIGHT_TOTEM_LINGER_SECONDS`** — Blinding light totem linger seconds.
- **L620 `MULTI_SHOT_BASE_DAMAGE_BONUS`** — Multi shot base damage bonus.
- **L621 `BIG_ENEMY_HP_MULTIPLIER`** — Big enemy hp multiplier.
- **L622 `GLOBAL_NON_BOSS_ENEMY_COUNT_MULTIPLIER`** — Global non boss enemy count multiplier.
- **L623 `GLOBAL_NON_BOSS_ENEMY_HP_MULTIPLIER`** — Global non boss enemy hp multiplier.
- **L624 `GLOBAL_NON_BOSS_ENEMY_SPEED_MULTIPLIER`** — Global non boss enemy speed multiplier.
- **L625 `GLOBAL_NON_BOSS_ENEMY_DAMAGE_MULTIPLIER`** — Global non boss enemy damage multiplier.
- **L626 `GLOBAL_BIG_ENEMY_COUNT_MULTIPLIER`** — Global big enemy count multiplier.
- **L627 `GLOBAL_BIG_ENEMY_HP_MULTIPLIER`** — Global big enemy hp multiplier.
- **L628 `GLOBAL_SKITTER_COUNT_MULTIPLIER`** — Global skitter count multiplier.
- **L629 `GLOBAL_SKITTER_HP_MULTIPLIER`** — Global skitter hp multiplier.
- **L630 `BIG_ENEMY_SPEED_MULTIPLIER`** — Big enemy speed multiplier.
- **L631 `ENEMY_TILE_LIMITS`** — Enemy tile limits.
- **L638 `SKITTER_EXPLOSION_DAMAGE_MULTIPLIER`** — Skitter explosion damage multiplier.
- **L639 `EXPLODING_STATUE_RADIUS`** — Exploding statue radius.
- **L640 `EXPLODING_STATUE_DAMAGE_PERCENT`** — Exploding statue damage percent.
- **L641 `EXPLODING_STATUE_ANIMATION_MS`** — Exploding statue animation ms.
- **L642 `ARCHER_PROJECTILE_ANIMATION_MS`** — Archer projectile animation ms.
- **L643 `ARCHER_PROJECTILE_SIZE_MULTIPLIER`** — Archer projectile size multiplier.
- **L644 `STATUE_EXPLOSION_GIF_SIZE_MULTIPLIER`** — Statue explosion gif size multiplier.
- **L645 `GREEN_FIRE_GIF_PATH`** — Green fire gif path.
- **L646 `BIG_ASS_SWORD_IMAGE_PATH`** — Big ass sword image path.
- **L647 `BERSERKER_AXE_IMAGE_PATH`** — Berserker axe image path.
- **L648 `SPELLBOW_LIGHTNING_SHAFT_IMAGE_PATH`** — Spellbow lightning shaft image path.
- **L649 `SPELLBOW_A_LOT_OF_ARROWS_IMAGE_PATH`** — Spellbow a lot of arrows image path.
- **L650 `SAGE_ROSE_PROJECTILE_IMAGE_PATH`** — Sage rose projectile image path.
- **L651 `SAGE_PETAL_STORM_IMAGE_PATH`** — Sage petal storm image path.
- **L652 `RED_FIRE_GIF_PATH`** — Red fire gif path.
- **L653 `PURPLE_FIRE_GIF_PATH`** — Purple fire gif path.
- **L654 `FIREBALL_GIF_PATH`** — Fireball gif path.
- **L655 `CANNONBALL_IMAGE_PATH`** — Cannonball image path.
- **L656 `DRAGOON_SPEAR_SWING_IMAGE_PATH`** — Dragoon spear swing image path.
- **L657 `DRAGOON_SPEAR_THROW_IMAGE_PATH`** — Dragoon spear throw image path.
- **L658 `MONK_FAST_FISTS_IMAGE_PATH`** — Monk fast fists image path.
- **L659 `CHAMPION_AUTO_ABILITY_DELAY_MS`** — Champion auto ability delay ms.
- **L660 `TOWER_ABILITY_CHAIN_DELAY_MS`** — Tower ability chain delay ms.
- **L661 `TORN_SOUL_BURN_DURATION_SECONDS`** — Torn soul burn duration seconds.
- **L662 `TORN_SOUL_BURN_RADIUS`** — Torn soul burn radius.
- **L663 `TORN_SOUL_DAMAGE_MULTIPLIER`** — Torn soul damage multiplier.
- **L664 `PURE_ENERGY_LEVEL`** — Pure energy level.
- **L665 `PURE_ENERGY_DAMAGE_MULTIPLIER`** — Pure energy damage multiplier.
- **L666 `PURE_ENERGY_SPEED_MULTIPLIER`** — Pure energy speed multiplier.
- **L667 `PURE_ENERGY_BURN_DURATION_MULTIPLIER`** — Pure energy burn duration multiplier.
- **L668 `PURE_ENERGY_BURN_RADIUS_BONUS`** — Pure energy burn radius bonus.
- **L669 `PURE_ENERGY_ARCHER_SHADOW_EXTRA_WAVES`** — Pure energy archer shadow extra waves.
- **L670 `SATELLITE_UPGRADE_COST_MULTIPLIER`** — Satellite upgrade cost multiplier.
- **L671 `SATELLITE_DAMAGE_MULTIPLIER`** — Satellite damage multiplier.
- **L672 `SATELLITE_DISSIPATE_AFTER_WAVES`** — Satellite dissipate after waves.
- **L673 `SATELLITE_FADE_STAGE_ONE_WAVES`** — Satellite fade stage one waves.
- **L674 `SATELLITE_FADE_STAGE_TWO_WAVES`** — Satellite fade stage two waves.
- **L675 `GUEST_ARCHER_SHADOW_DISSIPATE_AFTER_WAVES`** — Guest archer shadow dissipate after waves.
- **L676 `GUEST_ARCHER_SHADOW_FADE_STAGE_ONE_WAVES`** — Guest archer shadow fade stage one waves.
- **L677 `GUEST_ARCHER_SHADOW_FADE_STAGE_TWO_WAVES`** — Guest archer shadow fade stage two waves.
- **L679 `ENEMY_JEWEL_MULTIPLIER`** — Enemy jewel multiplier.
- **L680 `WARRIOR_HP_GROWTH_PER_LEVEL`** — Warrior hp growth per level.
- **L681 `WARRIOR_DAMAGE_GROWTH_PER_LEVEL`** — Warrior damage growth per level.
- **L682 `WARRIOR_POST_WAVE30_DAMAGE_GROWTH_PER_LEVEL`** — Warrior post wave30 damage growth per level.
- **L683 `DREADKNIGHT_DAMAGE_GROWTH_PER_LEVEL`** — Dreadknight damage growth per level.
- **L684 `CHAMPION_DAMAGE_CURVE_END_REDUCTION`** — Champion damage curve end reduction.
- **L685 `POST_WAVE100_ENEMY_COUNT_MULTIPLIER`** — Post wave100 enemy count multiplier.
- **L686 `POST_WAVE100_ENEMY_HP_MULTIPLIER`** — Post wave100 enemy hp multiplier.
- **L687 `POST_WAVE100_ENEMY_SPEED_MULTIPLIER`** — Post wave100 enemy speed multiplier.
- **L688 `BARRIER_REBUILD_COST`** — Barrier rebuild cost.
- **L689 `WAVE_REBUILD_INTERVAL`** — Wave rebuild interval.
- **L690 `UPDATE_MS`** — Update ms.
- **L691 `WAVE_BREAK_SECONDS`** — Wave break seconds.
- **L692 `RANDOM_OBSTACLE_COUNT`** — Random obstacle count.
- **L693 `PLAYER_OBSTACLE_COUNT`** — Player obstacle count.
- **L694 `GLOBAL_HERO_DAMAGE_MULTIPLIER`** — Global hero damage multiplier.
- **L695 `NON_WARRIOR_HERO_HP_MULTIPLIER`** — Non warrior hero hp multiplier.
- **L696 `GLOBAL_ENEMY_HP_MULTIPLIER`** — Global enemy hp multiplier.
- **L697 `GLOBAL_BOSS_MOVE_INTERVAL_MULTIPLIER`** — Global boss move interval multiplier.
- **L698 `MONK_PARTNER_DAMAGE_MULTIPLIER`** — Monk partner damage multiplier.
- **L699 `MONK_PARTNER_SPEED_MULTIPLIER`** — Monk partner speed multiplier.
- **L700 `MONK_PARTNER_RANGE_BONUS`** — Monk partner range bonus.
- **L701 `BERSERKER_WANDER_MIN_WAVES`** — Berserker wander min waves.
- **L702 `BERSERKER_WANDER_MAX_WAVES`** — Berserker wander max waves.
- **L703 `BERSERKER_WANDER_DURATION_WAVES`** — Berserker wander duration waves.
- **L704 `GEN0_WALLET_HERO_DAMAGE_MULTIPLIER`** — Gen0 wallet hero damage multiplier.
- **L705 `GEN0_WALLET_HERO_SPEED_MULTIPLIER`** — Gen0 wallet hero speed multiplier.
- **L706 `GEN0_WALLET_HERO_HP_MULTIPLIER`** — Gen0 wallet hero hp multiplier.
- **L707 `GEN0_WALLET_HERO_HEALING_MULTIPLIER`** — Gen0 wallet hero healing multiplier.
- **L709 `TOWER_TEMPLATES`** — Tower templates.
- **L884 `ENEMY_TEMPLATES`** — Enemy templates.
- **L891 `BOSSES`** — Bosses.
- **L980 `RELICS`** — Relics.
- **L1027 `MUTATIONS`** — Mutations.
- **L1291 `MAX_LIVE_WAVES`** — Max live waves.
- **L1528 `BASE_PLAYER_BARRIER_COUNT`** — Base player barrier count.
- **L1570 `DAILY_QUEST_GOAL_MULTIPLIER`** — Daily quest goal multiplier.
- **L1571 `DAILY_QUEST_BOARD_VERSION`** — Daily quest board version.
- **L1572 `DAILY_QUEST_TIER_CONFIG`** — Daily quest tier config.
- **L1591 `JEWEL_PER_HONK`** — Jewel per honk.
- **L1592 `HONK_PER_JEWEL`** — Honk per jewel.
- **L1593 `HONK_TOKEN_ADDRESS`** — Honk token address.
- **L1674 `BASE_DAILY_QUEST_POOL`** — Base daily quest pool.
- **L1718 `DAILY_QUEST_TIER_SOURCE_IDS`** — Daily quest tier source ids.
- **L1751 `DAILY_QUEST_BASE_MAP`** — Daily quest base map.
- **L1782 `DAILY_QUEST_TIER_POOLS`** — Daily quest tier pools.
- **L1789 `DAILY_QUEST_POOL`** — Daily quest pool.
- **L1896 `WEEKLY_BOUNTY_PROGRESS_VERSION`** — Weekly bounty progress version.
- **L2141 `WEEKLY_BOUNTY_DIFFICULTY`** — Weekly bounty difficulty.
- **L2188 `WEEKLY_BOUNTY_POOL`** — Weekly bounty pool.
- **L3100 `DFK_JEWEL_TOKEN_ADDRESS`** — Dfk jewel token address.
- **L3101 `DFK_JEWEL_TREASURY_ADDRESS`** — Dfk jewel treasury address.
- **L3102 `DFK_CREATE_TOKEN_SESSION_FUNCTION`** — Dfk create token session function.
- **L3103 `DFK_VERIFY_TOKEN_PAYMENT_FUNCTION`** — Dfk verify token payment function.
- **L3104 `DFK_JEWEL_GOLD_SWAP_WEI`** — Dfk jewel gold swap wei.
- **L3105 `DFK_HONK_GOLD_SWAP_AMOUNT`** — Dfk honk gold swap amount.
- **L3106 `DFK_EXTRA_HERO_JEWEL_COST`** — Dfk extra hero jewel cost.
- **L3107 `DFK_JEWEL_EXTRA_HIRE_WEI`** — Dfk jewel extra hire wei.
- **L3980 `TRACKED_RUN_REPLAY_CACHE_KEY`** — Tracked run replay cache key.
- **L4014 `TRACKED_RUN_STATS_CACHE_KEY`** — Tracked run stats cache key.
- **L4533 `BOUNTY_CLAIM_LOCK_TTL_MS`** — Bounty claim lock ttl ms.
- **L4868 `DFK_JEWEL_VERIFY_QUEUE_STORAGE_KEY`** — Dfk jewel verify queue storage key.
- **L5047 `DFK_GOLD_BURN_QUEUE_STORAGE_KEY`** — Dfk gold burn queue storage key.
- **L6407 `METIS_GEN0_INFLUENCE_THRESHOLD`** — Metis gen0 influence threshold.
- **L7762 `BOUNTY_BOARD_FUNCTION`** — Bounty board function.
- **L7763 `CLAIM_BOUNTY_FUNCTION`** — Claim bounty function.
- **L7764 `BOUNTY_RESET_PROGRESS_FUNCTION`** — Bounty reset progress function.
- **L7765 `REQUEST_REWARD_CLAIM_FUNCTION`** — Request reward claim function.
- **L8664 `INTRO_PAGES`** — Intro pages.
- **L8869 `HERO_TILE_IMAGES`** — Hero tile images.
- **L8888 `HERO_TILE_LABELS`** — Hero tile labels.
- **L8908 `DFK_CHAIN_ID`** — Dfk chain id.
- **L8909 `METIS_CHAIN_ID`** — Metis chain id.
- **L8910 `DFK_HERO_CORE_ADDRESS`** — Dfk hero core address.
- **L8911 `METIS_HERO_CORE_ADDRESS`** — Metis hero core address.
- **L8912 `DFK_CHAIN_RPC_URL`** — Dfk chain rpc url.
- **L8913 `DFK_CHAIN_RPC_FALLBACKS`** — Dfk chain rpc fallbacks.
- **L8917 `METIS_CHAIN_RPC_URL`** — Metis chain rpc url.
- **L8920 `DFK_BASE_CLASS_TO_SLOT`** — Dfk base class to slot.
- **L8930 `DFK_CLASS_NAMES`** — Dfk class names.
- **L8936 `DFK_RARITY_NAMES`** — Dfk rarity names.
- **L8937 `CHAMPION_DEFINITIONS`** — Champion definitions.
- **L8959 `CHAMPION_CLASS_LOOKUP`** — Champion class lookup.
- **L8960 `DFK_SLOT_ORDER`** — Dfk slot order.
- **L8961 `DFK_GOLD_CONTRACT_ADDRESS`** — Dfk gold contract address.
- **L8962 `DFK_GOLD_DECIMALS`** — Dfk gold decimals.
- **L8963 `DFK_GOLD_SWAP_COST`** — Dfk gold swap cost.
- **L8964 `DEFENDER_GOLD_SWAP_REWARD`** — Defender gold swap reward.
- **L8965 `AVAX_DEFENDER_GOLD_SWAP_WEI`** — Avax defender gold swap wei.
- **L8966 `AVAX_DEFENDER_GOLD_SWAP_REWARD`** — Avax defender gold swap reward.
- **L8967 `AVAX_MILESTONE_HERO_WEI`** — Avax milestone hero wei.
- **L8968 `AVAX_MILESTONE_BARRIER_WEI`** — Avax milestone barrier wei.
- **L8969 `AVAX_TREASURY_ADDRESS`** — Avax treasury address.
- **L8970 `MILESTONE_BARRIER_OFFER_DFK_COST`** — Milestone barrier offer dfk cost.
- **L8971 `MILESTONE_HERO_OFFER_COSTS`** — Milestone hero offer costs.
- **L8978 `DFK_GOLD_BURN_ADDRESS`** — Dfk gold burn address.
- **L8979 `DFK_GOLD_ERC20_ABI`** — Dfk gold erc20 abi.
- **L8985 `DFK_HERO_CORE_ABI`** — Dfk hero core abi.
- **L8993 `METIS_HERO_CORE_ABI`** — Metis hero core abi.
- **L9001 `METIS_PVP_ABI`** — Metis pvp abi.
- **L9009 `WALLET_HERO_CHAIN_CONFIGS`** — Wallet hero chain configs.
- **L9329 `KNOWN_GEN0_HERO_IDS`** — Known gen0 hero ids.
- **L9330 `KNOWN_NON_GEN0_HERO_IDS`** — Known non gen0 hero ids.
- **L10683 `LORE_PAGES`** — Lore pages.
- **L15024 `BASE_ELITE_WAVE_CONFIG`** — Base elite wave config.
### Event Listeners

- **L13 `document → touchend`** — Handles touchend events on document.
- **L121 `window → pointerdown`** — Handles pointerdown events on window.
- **L122 `window → keydown`** — Handles keydown events on window.
- **L123 `window → touchstart`** — Handles touchstart events on window.
- **L124 `document → visibilitychange`** — Handles visibilitychange events on document.
- **L463 `volumeSlider → pointerdown`** — Handles pointerdown events on volumeSlider.
- **L464 `volumeSlider → touchstart`** — Handles touchstart events on volumeSlider.
- **L465 `volumeSlider → focus`** — Handles focus events on volumeSlider.
- **L469 `btn → pointerdown`** — Handles pointerdown events on btn.
- **L470 `btn → touchstart`** — Handles touchstart events on btn.
- **L471 `btn → focus`** — Handles focus events on btn.
- **L474 `document → keydown`** — Handles keydown events on document.
- **L497 `overlay → click`** — Handles click events on overlay.
- **L502 `document → pointerdown`** — Handles pointerdown events on document.
- **L512 `window → load`** — Handles load events on window.
- **L2653 `modal → click`** — Handles click events on modal.
- **L2729 `closeBtn → click`** — Handles click events on closeBtn.
- **L2876 `modal → click`** — Handles click events on modal.
- **L3906 `modal → click`** — Handles click events on modal.
- **L4220 `prev → click`** — Handles click events on prev.
- **L4224 `next → click`** — Handles click events on next.
- **L4228 `play → click`** — Handles click events on play.
- **L4232 `copy → click`** — Handles click events on copy.
- **L4270 `modal → click`** — Handles click events on modal.
- **L5039 `window → online`** — Handles online events on window.
- **L5042 `document → visibilitychange`** — Handles visibilitychange events on document.
- **L5160 `window → online`** — Handles online events on window.
- **L5163 `document → visibilitychange`** — Handles visibilitychange events on document.
- **L5717 `avaxBtn → click`** — Handles click events on avaxBtn.
- **L5728 `jewelBtn → click`** — Handles click events on jewelBtn.
- **L5739 `honkBtn → click`** — Handles click events on honkBtn.
- **L5749 `cancelBtn → click`** — Handles click events on cancelBtn.
- **L5908 `btn → click`** — Handles click events on btn.
- **L5935 `refreshBtn → click`** — Handles click events on refreshBtn.
- **L5958 `cancelStuckBtn → click`** — Handles click events on cancelStuckBtn.
- **L5976 `barrierBtn → click`** — Handles click events on barrierBtn.
- **L5994 `skipBtn → click`** — Handles click events on skipBtn.
- **L6850 `damageHeader → click`** — Handles click events on damageHeader.
- **L6851 `els.damageReportBody → click`** — Handles click events on els.damageReportBody.
- **L9613 `img → error`** — Handles error events on img.
- **L9614 `button → click`** — Handles click events on button.
- **L10050 `quickDeployBtn → click`** — Handles click events on quickDeployBtn.
- **L10184 `toggle → click`** — Handles click events on toggle.
- **L10204 `card → click`** — Handles click events on card.
- **L11336 `headerBtn → click`** — Handles click events on headerBtn.
- **L11349 `search → click`** — Handles click events on search.
- **L11350 `search → input`** — Handles input events on search.
- **L11368 `selectedImg → error`** — Handles error events on selectedImg.
- **L11424 `img → error`** — Handles error events on img.
- **L11425 `button → click`** — Handles click events on button.
- **L11547 `portrait → error`** — Handles error events on portrait.
- **L11783 `btn → click`** — Handles click events on btn.
- **L11891 `popup → mouseenter`** — Handles mouseenter events on popup.
- **L11898 `popup → mouseleave`** — Handles mouseleave events on popup.
- **L12193 `buttonEl → pointerdown`** — Handles pointerdown events on buttonEl.
- **L12194 `buttonEl → pointerup`** — Handles pointerup events on buttonEl.
- **L12195 `buttonEl → pointerleave`** — Handles pointerleave events on buttonEl.
- **L12196 `buttonEl → pointercancel`** — Handles pointercancel events on buttonEl.
- **L12197 `buttonEl → blur`** — Handles blur events on buttonEl.
- **L12294 `scope → click`** — Handles click events on scope.
- **L12497 `btn → click`** — Handles click events on btn.
- **L12608 `btn → click`** — Handles click events on btn.
- **L12615 `icon → mouseenter`** — Handles mouseenter events on icon.
- **L12616 `icon → mouseleave`** — Handles mouseleave events on icon.
- **L12622 `icon → click`** — Handles click events on icon.
- **L12763 `championBtn → click`** — Handles click events on championBtn.
- **L12809 `btn → click`** — Handles click events on btn.
- **L12919 `btn → click`** — Handles click events on btn.
- **L12938 `swapBtn → click`** — Handles click events on swapBtn.
- **L12960 `avaxBtn → click`** — Handles click events on avaxBtn.
- **L12978 `jewelBtn → click`** — Handles click events on jewelBtn.
- **L13002 `honkBtn → click`** — Handles click events on honkBtn.
- **L13017 `skip → click`** — Handles click events on skip.
- **L13652 `passiveHeader → click`** — Handles click events on passiveHeader.
- **L13664 `btn → click`** — Handles click events on btn.
- **L19827 `window → resize`** — Handles resize events on window.
- **L19833 `els.startWaveBtn → click`** — Handles click events on els.startWaveBtn.
- **L19846 `window → pagehide`** — Handles pagehide events on window.
- **L19849 `window → beforeunload`** — Handles beforeunload events on window.
- **L19852 `window → dfk-defense:wallet-state`** — Handles dfk-defense:wallet-state events on window.
- **L19876 `els.restartBtn → click`** — Handles click events on els.restartBtn.
- **L19881 `window → dfk:tracked-runs-refresh-requested`** — Handles dfk:tracked-runs-refresh-requested events on window.
- **L19951 `window → dfk-defense:bank-balance`** — Handles dfk-defense:bank-balance events on window.
- **L19958 `window → dfk-defense:wallet-state`** — Handles dfk-defense:wallet-state events on window.
- **L19963 `window → dfk-defense:tracking-state`** — Handles dfk-defense:tracking-state events on window.
- **L20104 `els.seerIntroModal → pointerdown`** — Handles pointerdown events on els.seerIntroModal.
- **L20105 `els.seerIntroModal → click`** — Handles click events on els.seerIntroModal.
- **L20106 `els.seerIntroModal → touchstart`** — Handles touchstart events on els.seerIntroModal.
- **L20124 `document → click`** — Handles click events on document.
- **L20404 `els.upgradeBtn → click`** — Handles click events on els.upgradeBtn.
- **L20418 `els.moveBtn → click`** — Handles click events on els.moveBtn.
- **L20462 `els.grid → click`** — Handles click events on els.grid.
- **L20474 `els.grid → mousemove`** — Handles mousemove events on els.grid.
- **L20493 `els.grid → mouseleave`** — Handles mouseleave events on els.grid.
- **L20500 `window → resize`** — Handles resize events on window.
- **L20517 `window → error`** — Handles error events on window.
- **L20524 `window → unhandledrejection`** — Handles unhandledrejection events on window.
- **L20534 `window → resize`** — Handles resize events on window.
- **L20540 `window → orientationchange`** — Handles orientationchange events on window.
- **L20551 `window → beforeinstallprompt`** — Handles beforeinstallprompt events on window.
- **L20556 `window → appinstalled`** — Handles appinstalled events on window.
- **L20569 `document → keydown`** — Handles keydown events on document.
- **L20638 `document → DOMContentLoaded`** — Handles DOMContentLoaded events on document.
- **L20654 `btn → click`** — Handles click events on btn.
- **L20675 `document → DOMContentLoaded`** — Handles DOMContentLoaded events on document.
- **L20709 `backdrop → click`** — Handles click events on backdrop.
- **L20711 `panel → click`** — Handles click events on panel.
- **L20713 `btn → click`** — Handles click events on btn.
- **L20927 `document → visibilitychange`** — Handles visibilitychange events on document.
- **L20976 `document → DOMContentLoaded`** — Handles DOMContentLoaded events on document.
- **L20982 `topRefreshBtn → click`** — Handles click events on topRefreshBtn.
- **L21053 `window → load`** — Handles load events on window.
### Functions

- **L5 `isInteractiveTouchTarget`** — Is interactive touch target.
- **L26 `injectPlayButton`** — Inject play button.
- **L30 `forceMuteButtonBelowText`** — Force mute button below text.
- **L37 `playDarkSummonerLaugh`** — Play dark summoner laugh.
- **L51 `setBoardDim`** — Set board dim.
- **L73 `injectPlayButtonIntoStory`** — Inject play button into story.
- **L84 `isReplayUrlView`** — Is replay url view.
- **L95 `tryStartMusic`** — Try start music.
- **L129 `ensureStoryMusic`** — Ensure story music.
- **L141 `applyStoryMusicVolume`** — Apply story music volume.
- **L149 `stopStoryMusic`** — Stop story music.
- **L159 `startStoryMusic`** — Start story music.
- **L193 `renderStoryScreen`** — Render story screen.
- **L221 `playStorySequence`** — Play story sequence.
- **L234 `pulseStoryControls`** — Pulse story controls.
- **L248 `clearStoryTimers`** — Clear story timers.
- **L253 `queue`** — Queue.
- **L259 `syncStoryMusicControls`** — Sync story music controls.
- **L265 `syncStoryNavControls`** — Sync story nav controls.
- **L270 `tryStartMusic`** — Try start music.
- **L277 `finishStory`** — Finish story.
- **L339 `renderCurrentScreen`** — Render current screen.
- **L522 `getRandomTree`** — Get random tree.
- **L1262 `ensureMilestoneOfferModalElements`** — Ensure milestone offer modal elements.
- **L1526 `now`** — Now.
- **L1530 `getTargetPlayerObstacleCount`** — Get target player obstacle count.
- **L1534 `getCurrentPlacedBarrierCount`** — Get current placed barrier count.
- **L1538 `hasReachedPlayerBarrierCap`** — Has reached player barrier cap.
- **L1543 `getRelicRarity`** — Get relic rarity.
- **L1549 `weightedRelicRarity`** — Weighted relic rarity.
- **L1557 `isRelicFree`** — Is relic free.
- **L1561 `getRelicCostLabel`** — Get relic cost label.
- **L1565 `getSeerDamageMultiplier`** — Get seer damage multiplier.
- **L1579 `formatQuestAvaxReward`** — Format quest avax reward.
- **L1585 `getQuestRewardAmountAvax`** — Get quest reward amount avax.
- **L1595 `getDailyQuestRewardCurrencySelection`** — Get daily quest reward currency selection.
- **L1601 `setDailyQuestRewardCurrencySelection`** — Set daily quest reward currency selection.
- **L1607 `restoreDailyQuestRewardCurrencySelection`** — Restore daily quest reward currency selection.
- **L1617 `roundHonkQuestPayout`** — Round honk quest payout.
- **L1623 `roundHonkPurchaseCost`** — Round honk purchase cost.
- **L1629 `getQuestRewardAmountHonk`** — Get quest reward amount honk.
- **L1634 `getHonkPurchaseAmountFromJewel`** — Get honk purchase amount from jewel.
- **L1639 `honkToWei`** — Honk to wei.
- **L1644 `formatHonkAmount`** — Format honk amount.
- **L1650 `formatQuestHonkReward`** — Format quest honk reward.
- **L1656 `getQuestRewardText`** — Get quest reward text.
- **L1662 `getQuestRewardCurrency`** — Get quest reward currency.
- **L1668 `getQuestRewardAmountValue`** — Get quest reward amount value.
- **L1724 `formatQuestGoal`** — Format quest goal.
- **L1728 `buildDailyQuestDescription`** — Build daily quest description.
- **L1756 `buildDailyQuestTierPool`** — Build daily quest tier pool.
- **L1796 `getQuestDefinitionById`** — Get quest definition by id.
- **L1801 `getDailyQuestDateKey`** — Get daily quest date key.
- **L1805 `getDailyQuestPlayerKey`** — Get daily quest player key.
- **L1809 `canUseDailyQuestTestReset`** — Can use daily quest test reset.
- **L1813 `canUseBountyProgressTestReset`** — Can use bounty progress test reset.
- **L1817 `getDailyQuestTestCycleStorageKey`** — Get daily quest test cycle storage key.
- **L1821 `getDailyQuestTestCycle`** — Get daily quest test cycle.
- **L1832 `setDailyQuestTestCycle`** — Set daily quest test cycle.
- **L1841 `getDailyQuestStorageKey`** — Get daily quest storage key.
- **L1847 `resetDailyQuestTestBoard`** — Reset daily quest test board.
- **L1873 `createEmptyDailyQuestMetrics`** — Create empty daily quest metrics.
- **L1898 `getWeeklyBountyWeekKey`** — Get weekly bounty week key.
- **L1907 `nextWeekIso`** — Next week iso.
- **L1914 `getWeeklyBountyStorageKey`** — Get weekly bounty storage key.
- **L1918 `createEmptyWeeklyBountyMetrics`** — Create empty weekly bounty metrics.
- **L1976 `cloneWeeklyBountyMetricsForRunSnapshot`** — Clone weekly bounty metrics for run snapshot.
- **L1987 `captureWeeklyBountyMetricsSnapshot`** — Capture weekly bounty metrics snapshot.
- **L1992 `buildRunWeeklyBountyMetricDelta`** — Build run weekly bounty metric delta.
- **L2003 `persistWeeklyBountyProgress`** — Persist weekly bounty progress.
- **L2011 `ensureWeeklyBountyProgress`** — Ensure weekly bounty progress.
- **L2030 `getWeeklyBountyMetric`** — Get weekly bounty metric.
- **L2035 `updateWeeklyBountyMetric`** — Update weekly bounty metric.
- **L2050 `getWeeklyBountyServerProgressValue`** — Get weekly bounty server progress value.
- **L2055 `getWeeklyBountyDisplayProgressValue`** — Get weekly bounty display progress value.
- **L2071 `getBountySyncDebugState`** — Get bounty sync debug state.
- **L2086 `getWeeklyBountyClaimProgressValue`** — Get weekly bounty claim progress value.
- **L2093 `getWeeklyBountyProgressValue`** — Get weekly bounty progress value.
- **L2097 `getPendingTrackedRunCount`** — Get pending tracked run count.
- **L2115 `getWeeklyBountyClaimNames`** — Get weekly bounty claim names.
- **L2123 `formatNumberShort`** — Format number short.
- **L2135 `formatWeeklyBountyRewardValue`** — Format weekly bounty reward value.
- **L2147 `buildWeeklyBounty`** — Build weekly bounty.
- **L2176 `pickWeightedWeeklyBounty`** — Pick weighted weekly bounty.
- **L2226 `pickWeeklyBountyTierEntries`** — Pick weekly bounty tier entries.
- **L2252 `pickWeeklyBountyEntries`** — Pick weekly bounty entries.
- **L2265 `getClientWeeklyBountyEntries`** — Get client weekly bounty entries.
- **L2329 `seededRandom`** — Seeded random.
- **L2343 `pickDailyQuestIds`** — Pick daily quest ids.
- **L2374 `persistDailyQuestBoard`** — Persist daily quest board.
- **L2387 `ensureDailyQuestBoard`** — Ensure daily quest board.
- **L2413 `getActiveDailyQuests`** — Get active daily quests.
- **L2418 `getQuestProgressValue`** — Get quest progress value.
- **L2427 `isQuestComplete`** — Is quest complete.
- **L2431 `isQuestClaimed`** — Is quest claimed.
- **L2435 `areFreeDailyQuestsComplete`** — Are free daily quests complete.
- **L2439 `getTierQuestIndex`** — Get tier quest index.
- **L2444 `arePriorSequentialQuestsClaimedOrComplete`** — Are prior sequential quests claimed or complete.
- **L2452 `isQuestUnlocked`** — Is quest unlocked.
- **L2459 `updateQuestMetric`** — Update quest metric.
- **L2479 `getSecondsUntilDailyQuestReset`** — Get seconds until daily quest reset.
- **L2490 `formatDailyQuestResetCountdown`** — Format daily quest reset countdown.
- **L2497 `getClaimedDailyQuestJewelTotal`** — Get claimed daily quest jewel total.
- **L2504 `waitForRewardClaimPayout`** — Wait for reward claim payout.
- **L2529 `claimDailyQuest`** — Claim daily quest.
- **L2616 `getRewardPayoutExplorerBase`** — Get reward payout explorer base.
- **L2625 `shortenHash`** — Shorten hash.
- **L2632 `ensureRewardPayoutNoticeModal`** — Ensure reward payout notice modal.
- **L2659 `hideRewardPayoutNoticeModal`** — Hide reward payout notice modal.
- **L2668 `hasVisibleIntroStyleModal`** — Has visible intro style modal.
- **L2689 `syncIntroOpenClassFromVisibleModals`** — Sync intro open class from visible modals.
- **L2697 `showRewardPayoutNotice`** — Show reward payout notice.
- **L2740 `formatQuestResetCountdown`** — Format quest reset countdown.
- **L2750 `renderDailyQuestsBoard`** — Render daily quests board.
- **L2844 `syncQuestModalInteractivity`** — Sync quest modal interactivity.
- **L2861 `hardenQuestModalInteractions`** — Harden quest modal interactions.
- **L2884 `openQuestsModal`** — Open quests modal.
- **L2915 `closeQuestsModal`** — Close quests modal.
- **L2932 `pickRelicChoices`** — Pick relic choices.
- **L2947 `getKnownRelicStorageKey`** — Get known relic storage key.
- **L2953 `loadPersistentKnownRelics`** — Load persistent known relics.
- **L2964 `savePersistentKnownRelics`** — Save persistent known relics.
- **L2972 `getPersistentKnownRelics`** — Get persistent known relics.
- **L2977 `syncPersistentKnownRelics`** — Sync persistent known relics.
- **L2982 `revealRelicsForPlayer`** — Reveal relics for player.
- **L2997 `markRelicsFound`** — Mark relics found.
- **L3007 `repairAllStatues`** — Repair all statues.
- **L3025 `getPortalMaxHp`** — Get portal max hp.
- **L3030 `repairPortalPercent`** — Repair portal percent.
- **L3040 `loadPremiumJewels`** — Load premium jewels.
- **L3054 `savePremiumJewels`** — Save premium jewels.
- **L3058 `awardPremiumJewels`** — Award premium jewels.
- **L3068 `updatePremiumJewelInfo`** — Update premium jewel info.
- **L3072 `buildRunTrackingHeroes`** — Build run tracking heroes.
- **L3086 `getConnectedWalletChainId`** — Get connected wallet chain id.
- **L3092 `isConnectedWalletOnAvax`** — Is connected wallet on avax.
- **L3096 `isConnectedWalletOnDfk`** — Is connected wallet on dfk.
- **L3116 `getWalletProvider`** — Get wallet provider.
- **L3121 `toPaddedHexWord`** — To padded hex word.
- **L3125 `formatJewelTokenAmount`** — Format jewel token amount.
- **L3136 `getWalletNativeJewelBalance`** — Get wallet native jewel balance.
- **L3141 `getWalletNativeJewelBalanceLabel`** — Get wallet native jewel balance label.
- **L3149 `weiToJewelNumber`** — Wei to jewel number.
- **L3157 `hasWalletJewelForWei`** — Has wallet jewel for wei.
- **L3161 `refreshWalletJewelTokenBalance`** — Refresh wallet jewel token balance.
- **L3171 `waitForDfkTransactionReceipt`** — Wait for dfk transaction receipt.
- **L3197 `sendDfkJewelPayment`** — Send dfk jewel payment.
- **L3217 `sendDfkHonkPayment`** — Send dfk honk payment.
- **L3234 `clearPendingMilestonePurchase`** — Clear pending milestone purchase.
- **L3238 `createPendingMilestonePurchase`** — Create pending milestone purchase.
- **L3253 `recoverPendingMilestoneJewelHire`** — Recover pending milestone jewel hire.
- **L3276 `performDfkJewelTrade`** — Perform dfk jewel trade.
- **L3364 `updateJewelTradeUi`** — Update jewel trade ui.
- **L3381 `updateRelicSwapUi`** — Update relic swap ui.
- **L3398 `buyRelicViewJewelGoldSwap`** — Buy relic view jewel gold swap.
- **L3402 `buyRelicViewHonkGoldSwap`** — Buy relic view honk gold swap.
- **L3406 `buyRelicViewDfkgoldSwap`** — Buy relic view dfkgold swap.
- **L3424 `getPreferredDfkTokenPaymentAsset`** — Get preferred dfk token payment asset.
- **L3428 `getDfkPaymentWeiForJewelAmount`** — Get dfk payment wei for jewel amount.
- **L3433 `getDfkPaymentLabelForJewelAmount`** — Get dfk payment label for jewel amount.
- **L3438 `buyJewelGoldSwap`** — Buy jewel gold swap.
- **L3461 `buyJewelExtraHero`** — Buy jewel extra hero.
- **L3484 `getActiveCryptoRailState`** — Get active crypto rail state.
- **L3490 `formatAvaxValue`** — Format avax value.
- **L3496 `getCurrentRunClientId`** — Get current run client id.
- **L3500 `hasAvaxRailsPurchaseSupport`** — Has avax rails purchase support.
- **L3504 `canUseAvaxRailsPurchases`** — Can use avax rails purchases.
- **L3508 `shouldOfferAvaxSwap`** — Should offer avax swap.
- **L3512 `performAvaxTreasuryPurchase`** — Perform avax treasury purchase.
- **L3523 `buildPaymentSummary`** — Build payment summary.
- **L3548 `hasAvailableLastChanceForRunTracking`** — Has available last chance for run tracking.
- **L3555 `markLastChanceResolvedForRunTracking`** — Mark last chance resolved for run tracking.
- **L3562 `forfeitLastChanceForRunTracking`** — Forfeit last chance for run tracking.
- **L3574 `cloneReplayData`** — Clone replay data.
- **L3583 `sanitizeReplayText`** — Sanitize replay text.
- **L3587 `getReplayElapsedMs`** — Get replay elapsed ms.
- **L3593 `getReplayInitialState`** — Get replay initial state.
- **L3604 `buildReplayTowerState`** — Build replay tower state.
- **L3645 `buildReplayEnemyState`** — Build replay enemy state.
- **L3674 `buildReplayWaveSnapshot`** — Build replay wave snapshot.
- **L3702 `beginReplayCapture`** — Begin replay capture.
- **L3715 `ensureReplayCapture`** — Ensure replay capture.
- **L3720 `recordReplayEvent`** — Record replay event.
- **L3731 `captureReplayWaveSnapshot`** — Capture replay wave snapshot.
- **L3739 `maybeCaptureReplayBattleSnapshot`** — Maybe capture replay battle snapshot.
- **L3753 `buildReplayPayload`** — Build replay payload.
- **L3773 `buildReplayShareUrl`** — Build replay share url.
- **L3788 `formatCompactNumber`** — Format compact number.
- **L3794 `titleCaseToken`** — Title case token.
- **L3802 `prettifyRelicId`** — Prettify relic id.
- **L3808 `getRunStatsHeroNames`** — Get run stats hero names.
- **L3817 `getRunStatsRelicNames`** — Get run stats relic names.
- **L3825 `buildRunStatsReplayUrl`** — Build run stats replay url.
- **L3830 `getRunStatsPayload`** — Get run stats payload.
- **L3862 `encodeRunStatsButtonPayload`** — Encode run stats button payload.
- **L3870 `decodeRunStatsButtonPayload`** — Decode run stats button payload.
- **L3879 `showQueuedRunStatsModal`** — Show queued run stats modal.
- **L3892 `ensureRunStatsModalElements`** — Ensure run stats modal elements.
- **L3912 `closeRunStatsModal`** — Close run stats modal.
- **L3919 `openRunStatsModal`** — Open run stats modal.
- **L3963 `syncReplayInteractionState`** — Sync replay interaction state.
- **L3982 `loadTrackedRunReplayCache`** — Load tracked run replay cache.
- **L3992 `saveTrackedRunReplayCache`** — Save tracked run replay cache.
- **L3998 `cacheTrackedRunReplayShareId`** — Cache tracked run replay share id.
- **L4007 `getCachedTrackedRunReplayShareId`** — Get cached tracked run replay share id.
- **L4016 `loadTrackedRunStatsCache`** — Load tracked run stats cache.
- **L4026 `saveTrackedRunStatsCache`** — Save tracked run stats cache.
- **L4032 `cacheTrackedRunStats`** — Cache tracked run stats.
- **L4054 `getCachedTrackedRunStats`** — Get cached tracked run stats.
- **L4062 `writeTextToClipboard`** — Write text to clipboard.
- **L4090 `copyReplayShareUrl`** — Copy replay share url.
- **L4095 `createReplayTowerFromSnapshot`** — Create replay tower from snapshot.
- **L4115 `applyReplaySnapshot`** — Apply replay snapshot.
- **L4180 `getReplayUiTargets`** — Get replay ui targets.
- **L4211 `ensureReplayPanelElements`** — Ensure replay panel elements.
- **L4240 `ensureReplayViewerElements`** — Ensure replay viewer elements.
- **L4281 `renderReplayViewerEvents`** — Render replay viewer events.
- **L4304 `syncReplayViewerUi`** — Sync replay viewer ui.
- **L4327 `closeReplayViewer`** — Close replay viewer.
- **L4347 `scheduleReplayViewerPlayback`** — Schedule replay viewer playback.
- **L4362 `toggleReplayViewerPlayback`** — Toggle replay viewer playback.
- **L4372 `stepReplayViewer`** — Step replay viewer.
- **L4382 `openReplayViewer`** — Open replay viewer.
- **L4434 `loadSharedReplayFromUrl`** — Load shared replay from url.
- **L4456 `buildCompletedRunPayload`** — Build completed run payload.
- **L4497 `hasTrackableRunInProgress`** — Has trackable run in progress.
- **L4506 `isRunTrackingEnabled`** — Is run tracking enabled.
- **L4514 `canQueueTrackedRunSubmission`** — Can queue tracked run submission.
- **L4528 `getRecentTrackedRunSubmissionStorageKey`** — Get recent tracked run submission storage key.
- **L4535 `getBountyClaimLockStorageKey`** — Get bounty claim lock storage key.
- **L4540 `readBountyClaimLock`** — Read bounty claim lock.
- **L4567 `writeBountyClaimLock`** — Write bounty claim lock.
- **L4584 `clearBountyClaimLock`** — Clear bounty claim lock.
- **L4590 `hydrateBountyClaimLockState`** — Hydrate bounty claim lock state.
- **L4608 `refreshBountyBoardWithRetry`** — Refresh bounty board with retry.
- **L4627 `markRecentTrackedRunSubmission`** — Mark recent tracked run submission.
- **L4636 `clearRecentTrackedRunSubmission`** — Clear recent tracked run submission.
- **L4644 `hasRecentTrackedRunSubmission`** — Has recent tracked run submission.
- **L4661 `normalizeAddress`** — Normalize address.
- **L4665 `isLikelyWalletAddress`** — Is likely wallet address.
- **L4670 `truncateWalletAddress`** — Truncate wallet address.
- **L4677 `getConnectedWalletAddress`** — Get connected wallet address.
- **L4683 `createDifficultyProfileForRun`** — Create difficulty profile for run.
- **L4707 `getWalletStateSnapshot`** — Get wallet state snapshot.
- **L4712 `getWalletDfkgoldBalance`** — Get wallet dfkgold balance.
- **L4717 `getWalletHonkBalance`** — Get wallet honk balance.
- **L4722 `getWalletHonkBalanceLabel`** — Get wallet honk balance label.
- **L4728 `hasWalletHonkForJewelAmount`** — Has wallet honk for jewel amount.
- **L4732 `hasDfkgoldForSwap`** — Has dfkgold for swap.
- **L4736 `refreshWalletEconomyDetails`** — Refresh wallet economy details.
- **L4743 `formatRaffleWinnerDateShort`** — Format raffle winner date short.
- **L4752 `getCurrentUtcDateOnly`** — Get current utc date only.
- **L4756 `getRaffleSlotDisplayDay`** — Get raffle slot display day.
- **L4760 `getRaffleWinnerDrawTimeMs`** — Get raffle winner draw time ms.
- **L4773 `isRaffleSlotWinnerDisplayable`** — Is raffle slot winner displayable.
- **L4795 `normalizeDailyRaffleWinnerEntry`** — Normalize daily raffle winner entry.
- **L4809 `updateBurnedGoldDisplay`** — Update burned gold display.
- **L4834 `getSupabaseFunctionConfig`** — Get supabase function config.
- **L4840 `callSupabaseFunctionJson`** — Call supabase function json.
- **L4870 `isTerminalJewelVerificationError`** — Is terminal jewel verification error.
- **L4885 `normalizePendingDfkJewelVerification`** — Normalize pending dfk jewel verification.
- **L4910 `readPendingDfkJewelVerificationQueue`** — Read pending dfk jewel verification queue.
- **L4922 `writePendingDfkJewelVerificationQueue`** — Write pending dfk jewel verification queue.
- **L4934 `enqueuePendingDfkJewelVerification`** — Enqueue pending dfk jewel verification.
- **L4955 `removePendingDfkJewelVerification`** — Remove pending dfk jewel verification.
- **L4966 `flushPendingDfkJewelVerificationQueue`** — Flush pending dfk jewel verification queue.
- **L5033 `startPendingDfkJewelVerificationQueueLoop`** — Start pending dfk jewel verification queue loop.
- **L5049 `normalizeBurnQueueItem`** — Normalize burn queue item.
- **L5069 `readPendingDfkgoldBurnQueue`** — Read pending dfkgold burn queue.
- **L5081 `writePendingDfkgoldBurnQueue`** — Write pending dfkgold burn queue.
- **L5093 `enqueuePendingDfkgoldBurn`** — Enqueue pending dfkgold burn.
- **L5113 `removePendingDfkgoldBurn`** — Remove pending dfkgold burn.
- **L5120 `flushPendingDfkgoldBurnQueue`** — Flush pending dfkgold burn queue.
- **L5154 `startPendingDfkgoldBurnQueueLoop`** — Start pending dfkgold burn queue loop.
- **L5168 `fetchSupabaseFunctionJson`** — Fetch supabase function json.
- **L5214 `getSupabaseRestConfig`** — Get supabase rest config.
- **L5221 `fetchSupabaseRestCount`** — Fetch supabase rest count.
- **L5240 `fetchSupabaseRestPaginated`** — Fetch supabase rest paginated.
- **L5275 `summarizeBurnTotalsFromRows`** — Summarize burn totals from rows.
- **L5299 `summarizeBurnTotalsFromRunRows`** — Summarize burn totals from run rows.
- **L5315 `fetchGlobalBurnedGoldTotalsViaRest`** — Fetch global burned gold totals via rest.
- **L5348 `findFirstNumericFieldDeep`** — Find first numeric field deep.
- **L5371 `sumNumericFieldInArraysDeep`** — Sum numeric field in arrays deep.
- **L5396 `fetchLatestDailyRaffleWinnerDirect`** — Fetch latest daily raffle winner direct.
- **L5411 `fetchGlobalBurnedGoldTotal`** — Fetch global burned gold total.
- **L5499 `startGlobalBurnedGoldRefreshLoop`** — Start global burned gold refresh loop.
- **L5508 `shouldOfferDfkgoldSwap`** — Should offer dfkgold swap.
- **L5512 `shouldOfferJewelSwap`** — Should offer jewel swap.
- **L5516 `shouldOfferAnyPremiumSwap`** — Should offer any premium swap.
- **L5520 `getAvailableRelicPool`** — Get available relic pool.
- **L5524 `shouldAttachRelicsToOffer`** — Should attach relics to offer.
- **L5529 `ensureRelicChoicesForOffer`** — Ensure relic choices for offer.
- **L5538 `openDfkgoldSwapOffer`** — Open dfkgold swap offer.
- **L5546 `closeDfkgoldSwapOffer`** — Close dfkgold swap offer.
- **L5552 `getMilestoneHeroOfferConfig`** — Get milestone hero offer config.
- **L5560 `hasMilestoneBarrierOffer`** — Has milestone barrier offer.
- **L5565 `getMilestoneBarrierOfferConfig`** — Get milestone barrier offer config.
- **L5571 `canOpenMilestoneBarrierOffer`** — Can open milestone barrier offer.
- **L5577 `openMilestoneBarrierOffer`** — Open milestone barrier offer.
- **L5587 `canOpenMilestoneHeroOffer`** — Can open milestone hero offer.
- **L5593 `openMilestoneHeroOffer`** — Open milestone hero offer.
- **L5603 `hasActiveMilestoneOffer`** — Has active milestone offer.
- **L5607 `finishMilestoneOffer`** — Finish milestone offer.
- **L5625 `getMilestoneHeroJewelPriceIndex`** — Get milestone hero jewel price index.
- **L5630 `getMilestoneHeroJewelPriceWei`** — Get milestone hero jewel price wei.
- **L5635 `getMilestoneHeroJewelPriceLabel`** — Get milestone hero jewel price label.
- **L5640 `getMilestoneHeroHonkPriceWei`** — Get milestone hero honk price wei.
- **L5645 `getMilestoneHeroHonkPriceLabel`** — Get milestone hero honk price label.
- **L5650 `ensureMilestonePaymentChoiceModalElements`** — Ensure milestone payment choice modal elements.
- **L5679 `setMilestonePaymentChoiceProcessing`** — Set milestone payment choice processing.
- **L5686 `setMilestoneHeroOfferProcessing`** — Set milestone hero offer processing.
- **L5693 `openMilestonePaymentChoiceModal`** — Open milestone payment choice modal.
- **L5758 `beginMilestoneHeroHireFlow`** — Begin milestone hero hire flow.
- **L5786 `queueMilestoneReinforcement`** — Queue milestone reinforcement.
- **L5807 `showHeroPlacementReminder`** — Show hero placement reminder.
- **L5814 `getAvailableUnplacedHeroLabels`** — Get available unplaced hero labels.
- **L5826 `maybeShowUnplacedHeroReminder`** — Maybe show unplaced hero reminder.
- **L5837 `setMilestoneOfferTxnPending`** — Set milestone offer txn pending.
- **L5843 `clearMilestoneOfferTxnPending`** — Clear milestone offer txn pending.
- **L5849 `renderMilestoneHeroOffer`** — Render milestone hero offer.
- **L5999 `beginMilestoneBarrierOffer`** — Begin milestone barrier offer.
- **L6020 `beginMilestoneBarrierOfferAvax`** — Begin milestone barrier offer avax.
- **L6042 `beginMilestoneHeroHire`** — Begin milestone hero hire.
- **L6075 `beginMilestoneHeroHireJewel`** — Begin milestone hero hire jewel.
- **L6106 `beginMilestoneHeroHireHonk`** — Begin milestone hero hire honk.
- **L6137 `beginMilestoneHeroHireAvax`** — Begin milestone hero hire avax.
- **L6165 `recordDfkgoldBurn`** — Record dfkgold burn.
- **L6177 `ensureWalletOnDfKChain`** — Ensure wallet on df kchain.
- **L6189 `performVerifiedDfkgoldBurnPurchase`** — Perform verified dfkgold burn purchase.
- **L6249 `performDfkgoldSwap`** — Perform dfkgold swap.
- **L6265 `performAvaxGoldSwap`** — Perform avax gold swap.
- **L6288 `canUseTestGoldGrant`** — Can use test gold grant.
- **L6293 `canUseChampionFastModeToggle`** — Can use champion fast mode toggle.
- **L6298 `getChampionFastModeStorageKey`** — Get champion fast mode storage key.
- **L6303 `isChampionFastModeEnabled`** — Is champion fast mode enabled.
- **L6312 `updateChampionFastModeButtonState`** — Update champion fast mode button state.
- **L6324 `toggleChampionFastMode`** — Toggle champion fast mode.
- **L6342 `canUseMetisInfluenceDebug`** — Can use metis influence debug.
- **L6346 `updateMetisInfluenceDebugButtonState`** — Update metis influence debug button state.
- **L6357 `loadMetisPledgedHeroIdsForAddress`** — Load metis pledged hero ids for address.
- **L6388 `formatDebugValue`** — Format debug value.
- **L6397 `parseChainNumber`** — Parse chain number.
- **L6409 `isMetisGen0InfluenceValue`** — Is metis gen0 influence value.
- **L6413 `isExpectedNoProfileError`** — Is expected no profile error.
- **L6419 `withChainReadTimeout`** — With chain read timeout.
- **L6431 `getReadableChainError`** — Get readable chain error.
- **L6435 `readMetisHeroInfluenceFlags`** — Read metis hero influence flags.
- **L6474 `readMetisHeroInfluenceDebugRow`** — Read metis hero influence debug row.
- **L6513 `debugMetisInfluenceForWalletHeroes`** — Debug metis influence for wallet heroes.
- **L6581 `canUseChampionWaveOneOverride`** — Can use champion wave one override.
- **L6585 `getChampionRequiredWaitWaves`** — Get champion required wait waves.
- **L6589 `canViewLiveDamageReport`** — Can view live damage report.
- **L6594 `ensureTowerDamageMethods`** — Ensure tower damage methods.
- **L6600 `recordTowerDamage`** — Record tower damage.
- **L6617 `ensureTowerHealingMethods`** — Ensure tower healing methods.
- **L6623 `recordTowerHealing`** — Record tower healing.
- **L6640 `getTowerDamageMethodRows`** — Get tower damage method rows.
- **L6660 `getTowerHealingMethodRows`** — Get tower healing method rows.
- **L6674 `renderDamageReportMethodValue`** — Render damage report method value.
- **L6684 `isDamageReportTowerExpanded`** — Is damage report tower expanded.
- **L6688 `toggleDamageReportTower`** — Toggle damage report tower.
- **L6695 `toggleDamageReportCollapsed`** — Toggle damage report collapsed.
- **L6700 `getTowerById`** — Get tower by id.
- **L6706 `ensureWalletHeroScanStatusMount`** — Ensure wallet hero scan status mount.
- **L6729 `setWalletHeroScanRunnerProgress`** — Set wallet hero scan runner progress.
- **L6738 `stopWalletHeroScanRunnerTimer`** — Stop wallet hero scan runner timer.
- **L6745 `startWalletHeroScanRunner`** — Start wallet hero scan runner.
- **L6758 `finishWalletHeroScanRunner`** — Finish wallet hero scan runner.
- **L6763 `accelerateWalletHeroScanRunnerToPortal`** — Accelerate wallet hero scan runner to portal.
- **L6790 `getWalletHeroScanRemainingMs`** — Get wallet hero scan remaining ms.
- **L6796 `renderWalletHeroScanStatus`** — Render wallet hero scan status.
- **L6815 `showWalletHeroScanDoneNotice`** — Show wallet hero scan done notice.
- **L6826 `ensureDamageReportMount`** — Ensure damage report mount.
- **L6858 `getDamageReportOwnerTower`** — Get damage report owner tower.
- **L6866 `buildDamageReportRows`** — Build damage report rows.
- **L6932 `isTornSoulArchon`** — Is torn soul archon.
- **L6936 `isPureEnergyArchon`** — Is pure energy archon.
- **L6940 `getTornSoulDamageMultiplier`** — Get torn soul damage multiplier.
- **L6945 `getTornSoulExplosionMultiplier`** — Get torn soul explosion multiplier.
- **L6950 `getTornSoulBurnDurationSeconds`** — Get torn soul burn duration seconds.
- **L6954 `getTornSoulBurnRadius`** — Get torn soul burn radius.
- **L6958 `getTornSoulDisplayName`** — Get torn soul display name.
- **L6963 `normalizeTornSoulDamage`** — Normalize torn soul damage.
- **L6972 `renderDamageReport`** — Render damage report.
- **L7032 `updateTestGoldButtonState`** — Update test gold button state.
- **L7040 `grantTestGold`** — Grant test gold.
- **L7057 `runTrackerCallSafely`** — Run tracker call safely.
- **L7068 `captureTrackedRunNow`** — Capture tracked run now.
- **L7090 `maybeConfirmAndCaptureTrackedReset`** — Maybe confirm and capture tracked reset.
- **L7099 `submitCompletedRunOnce`** — Submit completed run once.
- **L7180 `syncPremiumJewelsFromSettledBank`** — Sync premium jewels from settled bank.
- **L7189 `key`** — Key.
- **L7190 `tileAt`** — Tile at.
- **L7191 `clamp`** — Clamp.
- **L7192 `dist`** — Dist.
- **L7193 `chance`** — Chance.
- **L7194 `pickRandom`** — Pick random.
- **L7195 `adjacentTiles`** — Adjacent tiles.
- **L7196 `inBounds`** — In bounds.
- **L7197 `rarityForLevel`** — Rarity for level.
- **L7199 `getRandomTreeVariant`** — Get random tree variant.
- **L7204 `getSpawnBounds`** — Get spawn bounds.
- **L7216 `createHitFlash`** — Create hit flash.
- **L7230 `heroColorKey`** — Hero color key.
- **L7243 `initGrid`** — Init grid.
- **L7278 `assignRandomBreachTiles`** — Assign random breach tiles.
- **L7295 `hasMeaningfulRunInProgress`** — Has meaningful run in progress.
- **L7306 `resetGame`** — Reset game.
- **L7512 `placeRandomObstacles`** — Place random obstacles.
- **L7539 `clearRandomObstacles`** — Clear random obstacles.
- **L7545 `countValidPortalPlacements`** — Count valid portal placements.
- **L7555 `randInt`** — Rand int.
- **L7559 `setInstruction`** — Set instruction.
- **L7572 `log`** — Log.
- **L7580 `showBanner`** — Show banner.
- **L7586 `pushDiagnosticEvent`** — Push diagnostic event.
- **L7592 `markProgress`** — Mark progress.
- **L7597 `getPendingSpawnCount`** — Get pending spawn count.
- **L7601 `buildProgressHash`** — Build progress hash.
- **L7617 `ensureCrashPanel`** — Ensure crash panel.
- **L7639 `hideCrashPanel`** — Hide crash panel.
- **L7645 `copyCrashReport`** — Copy crash report.
- **L7662 `inferCrashHint`** — Infer crash hint.
- **L7679 `showCrashReport`** — Show crash report.
- **L7706 `escapeHtml`** — Escape html.
- **L7716 `syncStatusOverlayVisibility`** — Sync status overlay visibility.
- **L7736 `showStatusOverlay`** — Show status overlay.
- **L7767 `getBountySupabaseConfig`** — Get bounty supabase config.
- **L7773 `getRunTrackerSessionToken`** — Get run tracker session token.
- **L7779 `isSessionAuthFailureMessage`** — Is session auth failure message.
- **L7783 `refreshRunTrackerSessionToken`** — Refresh run tracker session token.
- **L7794 `buildFunctionAuthHeaders`** — Build function auth headers.
- **L7803 `callBountyFunction`** — Call bounty function.
- **L7847 `sendRequest`** — Send request.
- **L7903 `getRewardClaimPlayerName`** — Get reward claim player name.
- **L7911 `requestRewardClaim`** — Request reward claim.
- **L7915 `canSubmitRewardClaims`** — Can submit reward claims.
- **L7920 `formatBountyCountdown`** — Format bounty countdown.
- **L7931 `getBountyCardClass`** — Get bounty card class.
- **L7937 `getBountyStateLabel`** — Get bounty state label.
- **L7944 `escapeHtml`** — Escape html.
- **L7953 `formatTrackedRunTimestamp`** — Format tracked run timestamp.
- **L7966 `getTrackedRunChainLabel`** — Get tracked run chain label.
- **L7973 `getTrackedRunTimestampValue`** — Get tracked run timestamp value.
- **L7979 `getTrackedRunChainSortValue`** — Get tracked run chain sort value.
- **L7987 `sortTrackedRuns`** — Sort tracked runs.
- **L8027 `renderTrackedRunsBoard`** — Render tracked runs board.
- **L8144 `openTrackedRunsModal`** — Open tracked runs modal.
- **L8175 `closeTrackedRunsModal`** — Close tracked runs modal.
- **L8192 `renderBountyBoard`** — Render bounty board.
- **L8347 `startBountyCountdownTick`** — Start bounty countdown tick.
- **L8356 `stopBountyCountdownTick`** — Stop bounty countdown tick.
- **L8362 `refreshBountyBoard`** — Refresh bounty board.
- **L8387 `claimActiveBounty`** — Claim active bounty.
- **L8464 `clearWalletSpecificBountyAndTrackingState`** — Clear wallet specific bounty and tracking state.
- **L8492 `resetWeeklyBountyProgressForTestWallet`** — Reset weekly bounty progress for test wallet.
- **L8536 `getEliteWaveSummary`** — Get elite wave summary.
- **L8547 `shakeEliteWaveWarning`** — Shake elite wave warning.
- **L8554 `openEliteWaveModal`** — Open elite wave modal.
- **L8563 `closeEliteWaveModal`** — Close elite wave modal.
- **L8569 `maybeShowEliteWaveWarning`** — Maybe show elite wave warning.
- **L8577 `openKnownRelicsModal`** — Open known relics modal.
- **L8609 `closeKnownRelicsModal`** — Close known relics modal.
- **L8615 `openBountyModal`** — Open bounty modal.
- **L8644 `closeBountyModal`** — Close bounty modal.
- **L9014 `getWalletRpcProvider`** — Get wallet rpc provider.
- **L9020 `getWalletHeroChainConfig`** — Get wallet hero chain config.
- **L9026 `getWalletHeroImageId`** — Get wallet hero image id.
- **L9032 `getWalletHeroNumericId`** — Get wallet hero numeric id.
- **L9038 `getWalletHeroChainName`** — Get wallet hero chain name.
- **L9043 `getWalletHeroSourceBadge`** — Get wallet hero source badge.
- **L9048 `isGen0WalletHero`** — Is gen0 wallet hero.
- **L9064 `getWalletHeroGenerationBadge`** — Get wallet hero generation badge.
- **L9068 `getWalletHeroBonusEligibilityText`** — Get wallet hero bonus eligibility text.
- **L9072 `getWalletHeroLineParts`** — Get wallet hero line parts.
- **L9082 `isGen0BonusTower`** — Is gen0 bonus tower.
- **L9089 `getWalletHeroById`** — Get wallet hero by id.
- **L9100 `getSelectedGen0WalletHeroCount`** — Get selected gen0 wallet hero count.
- **L9109 `normalizeHeroTypeKey`** — Normalize hero type key.
- **L9113 `activateGen0ClassForType`** — Activate gen0 class for type.
- **L9124 `isGen0ClassActive`** — Is gen0 class active.
- **L9129 `getGen0HeroButtonMode`** — Get gen0 hero button mode.
- **L9136 `getActiveGen0ClassCount`** — Get active gen0 class count.
- **L9140 `getGen0BuffInfoMarkup`** — Get gen0 buff info markup.
- **L9162 `getActiveGen0ClassNames`** — Get active gen0 class names.
- **L9171 `getGen0ClassDisplayName`** — Get gen0 class display name.
- **L9186 `ensureGen0ActiveBannerEl`** — Ensure gen0 active banner el.
- **L9201 `renderGen0ActiveBanner`** — Render gen0 active banner.
- **L9214 `applyGen0CombatBonusToTower`** — Apply gen0 combat bonus to tower.
- **L9241 `applyGen0WalletHeroCombatBonus`** — Apply gen0 wallet hero combat bonus.
- **L9247 `applyInheritedGen0ClassBonus`** — Apply inherited gen0 class bonus.
- **L9253 `normalizeWalletHeroRecord`** — Normalize wallet hero record.
- **L9272 `normalizeWalletHeroNetwork`** — Normalize wallet hero network.
- **L9294 `compareWalletHeroes`** — Compare wallet heroes.
- **L9306 `getWalletHeroKey`** — Get wallet hero key.
- **L9310 `normalizeHeroMediaUrl`** — Normalize hero media url.
- **L9320 `getWalletHeroFallbackSources`** — Get wallet hero fallback sources.
- **L9332 `normalizeHeroIdText`** — Normalize hero id text.
- **L9336 `getUnpaddedHeroIdText`** — Get unpadded hero id text.
- **L9348 `extractNumericTraitValue`** — Extract numeric trait value.
- **L9356 `extractHeroMetadataGeneration`** — Extract hero metadata generation.
- **L9375 `readHeroMetadata`** — Read hero metadata.
- **L9387 `readHeroGenerationFromMetadata`** — Read hero generation from metadata.
- **L9404 `getKnownHeroGen0Override`** — Get known hero gen0 override.
- **L9412 `getFallbackGen0FromHeroId`** — Get fallback gen0 from hero id.
- **L9419 `readHeroMetadataImage`** — Read hero metadata image.
- **L9446 `getDefaultHeroImageForType`** — Get default hero image for type.
- **L9450 `getWalletHeroImage`** — Get wallet hero image.
- **L9456 `getChampionPortraitImage`** — Get champion portrait image.
- **L9467 `getDfKClassName`** — Get df kclass name.
- **L9472 `getDfKRarityName`** — Get df krarity name.
- **L9477 `getTransferHeroSearchValue`** — Get transfer hero search value.
- **L9481 `getTransferHeroSortValue`** — Get transfer hero sort value.
- **L9485 `compareTransferHeroes`** — Compare transfer heroes.
- **L9505 `getFilteredTransferHeroes`** — Get filtered transfer heroes.
- **L9515 `getTransferHeroPageCount`** — Get transfer hero page count.
- **L9521 `clampTransferHeroPage`** — Clamp transfer hero page.
- **L9527 `getPaginatedTransferHeroes`** — Get paginated transfer heroes.
- **L9535 `getSelectedTransferHeroIds`** — Get selected transfer hero ids.
- **L9540 `syncTransferHeroSummary`** — Sync transfer hero summary.
- **L9546 `setTransferHeroesStatus`** — Set transfer heroes status.
- **L9550 `clearTransferHeroSelection`** — Clear transfer hero selection.
- **L9555 `toggleTransferHeroSelection`** — Toggle transfer hero selection.
- **L9564 `renderTransferHeroesModal`** — Render transfer heroes modal.
- **L9631 `closeTransferHeroesModal`** — Close transfer heroes modal.
- **L9637 `openTransferHeroesModal`** — Open transfer heroes modal.
- **L9655 `selectAllVisibleTransferHeroes`** — Select all visible transfer heroes.
- **L9663 `confirmTransferHeroes`** — Confirm transfer heroes.
- **L9696 `handleWalletHeroImageError`** — Handle wallet hero image error.
- **L9706 `toggleWalletHeroType`** — Toggle wallet hero type.
- **L9713 `setWalletHeroSearch`** — Set wallet hero search.
- **L9723 `ensureWalletHeroSectionHome`** — Ensure wallet hero section home.
- **L9732 `moveWalletHeroSectionToModalLayer`** — Move wallet hero section to modal layer.
- **L9738 `restoreWalletHeroSectionHome`** — Restore wallet hero section home.
- **L9746 `setWalletHeroPanelCollapsed`** — Set wallet hero panel collapsed.
- **L9767 `getSelectedWalletHero`** — Get selected wallet hero.
- **L9773 `isStartingWalletHeroPlacementWindow`** — Is starting wallet hero placement window.
- **L9777 `getSelectedWalletHeroForHire`** — Get selected wallet hero for hire.
- **L9786 `hasSelectedWarriorWalletHero`** — Has selected warrior wallet hero.
- **L9790 `getActiveNonSatelliteWarrior`** — Get active non satellite warrior.
- **L9794 `canUseWarriorNftReplacement`** — Can use warrior nft replacement.
- **L9803 `rememberWarriorNftForReplacement`** — Remember warrior nft for replacement.
- **L9814 `clearUnplacedStartingGen0Placement`** — Clear unplaced starting gen0 placement.
- **L9826 `getChampionWavesWaited`** — Get champion waves waited.
- **L9838 `getChampionTestRoster`** — Get champion test roster.
- **L9852 `getSelectedChampionRecord`** — Get selected champion record.
- **L9882 `isCasterTowerType`** — Is caster tower type.
- **L9886 `hasLivingChampionOfType`** — Has living champion of type.
- **L9890 `hasSageChampionBuff`** — Has sage champion buff.
- **L9894 `isMeleeHeroType`** — Is melee hero type.
- **L9898 `hasSageChampionMeleeBuff`** — Has sage champion melee buff.
- **L9902 `isUnderSageGlowProtection`** — Is under sage glow protection.
- **L9907 `getSageGlowProtectedAllies`** — Get sage glow protected allies.
- **L9915 `hasDragoonLeadershipBuff`** — Has dragoon leadership buff.
- **L9919 `hasDragoonOverpowerBuff`** — Has dragoon overpower buff.
- **L9923 `getChampionPointTarget`** — Get champion point target.
- **L9932 `knockbackEnemyTowardPortal`** — Knockback enemy toward portal.
- **L9970 `toTitleCaseWords`** — To title case words.
- **L9974 `formatChampionSkillMarkup`** — Format champion skill markup.
- **L9985 `ensureChampionCollapsedPreview`** — Ensure champion collapsed preview.
- **L9998 `getChampionDeployPreview`** — Get champion deploy preview.
- **L10009 `maybeRemindChampionDeployment`** — Maybe remind champion deployment.
- **L10027 `renderChampionCollapsedPreview`** — Render champion collapsed preview.
- **L10058 `setChampionPanelCollapsed`** — Set champion panel collapsed.
- **L10078 `getDetectedChampionRoster`** — Get detected champion roster.
- **L10102 `updateChampionDetectionFromRoster`** — Update champion detection from roster.
- **L10144 `ensureChampionSelectionReady`** — Ensure champion selection ready.
- **L10165 `renderChampionCards`** — Render champion cards.
- **L10224 `canChooseChampionNow`** — Can choose champion now.
- **L10228 `hasStartedRunForChampionLock`** — Has started run for champion lock.
- **L10232 `shouldLockWalletHeroRefreshDuringRun`** — Should lock wallet hero refresh during run.
- **L10236 `syncWalletHeroRefreshButtonState`** — Sync wallet hero refresh button state.
- **L10246 `showWalletHeroRefreshLockedMessage`** — Show wallet hero refresh locked message.
- **L10250 `showChampionTimingDebug`** — Show champion timing debug.
- **L10267 `showChampionModal`** — Show champion modal.
- **L10308 `hideChampionModal`** — Hide champion modal.
- **L10315 `cancelChampionModal`** — Cancel champion modal.
- **L10322 `showChampionLockModal`** — Show champion lock modal.
- **L10339 `hideChampionLockModal`** — Hide champion lock modal.
- **L10347 `finalizeChampionConfirmation`** — Finalize champion confirmation.
- **L10365 `confirmSelectedChampion`** — Confirm selected champion.
- **L10383 `renderChampionPanel`** — Render champion panel.
- **L10435 `requireChampionSelectionBeforeStart`** — Require champion selection before start.
- **L10439 `beginChampionPlacement`** — Begin champion placement.
- **L10505 `retireChampionTower`** — Retire champion tower.
- **L10526 `maybeRetireChampionBetweenWaves`** — Maybe retire champion between waves.
- **L10533 `clearWalletHeroData`** — Clear wallet hero data.
- **L10560 `selectWalletHero`** — Select wallet hero.
- **L10568 `getWalletHeroPlacementCost`** — Get wallet hero placement cost.
- **L10573 `getArcherCooldownMultiplierForLevel`** — Get archer cooldown multiplier for level.
- **L10578 `getBaseTowerStatsForLevel`** — Get base tower stats for level.
- **L10597 `getWizardBaseDamageForLevel`** — Get wizard base damage for level.
- **L10602 `normalizeArcherStats`** — Normalize archer stats.
- **L10628 `formatJewel`** — Format jewel.
- **L10633 `updateModeButtons`** — Update mode buttons.
- **L10652 `setPlayMode`** — Set play mode.
- **L10660 `setTimeScale`** — Set time scale.
- **L10665 `setMobileMode`** — Set mobile mode.
- **L10671 `updatePauseButton`** — Update pause button.
- **L10704 `getActiveGuidePages`** — Get active guide pages.
- **L10711 `updateGuideModeToggle`** — Update guide mode toggle.
- **L10716 `updateQuestBoardToggle`** — Update quest board toggle.
- **L10735 `renderIntroPage`** — Render intro page.
- **L10762 `openIntroModal`** — Open intro modal.
- **L10782 `closeIntroModal`** — Close intro modal.
- **L10811 `updateTopbar`** — Update topbar.
- **L10833 `prettyPattern`** — Pretty pattern.
- **L10843 `setPaused`** — Set paused.
- **L10857 `render`** — Render.
- **L10876 `refreshPureEnergyState`** — Refresh pure energy state.
- **L10900 `getActiveRelicSummaryForTower`** — Get active relic summary for tower.
- **L10908 `getSelectionHeaderMarkup`** — Get selection header markup.
- **L10922 `decoratePureEnergyText`** — Decorate pure energy text.
- **L10928 `getPostWave100EnemyCountMultiplier`** — Get post wave100 enemy count multiplier.
- **L10932 `getPostWave100EnemyHpMultiplier`** — Get post wave100 enemy hp multiplier.
- **L10936 `getPostWave100EnemyMoveIntervalMultiplier`** — Get post wave100 enemy move interval multiplier.
- **L10940 `updateHeroActionDisabledState`** — Update hero action disabled state.
- **L10954 `getChampionDamageForLevel`** — Get champion damage for level.
- **L10966 `applyTowerLevelStep`** — Apply tower level step.
- **L11015 `applyWalletHeroToTower`** — Apply wallet hero to tower.
- **L11029 `commitWalletHeroRoster`** — Commit wallet hero roster.
- **L11057 `loadWalletHeroes`** — Load wallet heroes.
- **L11091 `createRpcProviderList`** — Create rpc provider list.
- **L11096 `withRpcProviderFailover`** — With rpc provider failover.
- **L11113 `loadDfkWalletHeroes`** — Load dfk wallet heroes.
- **L11163 `loadMetisWalletHeroes`** — Load metis wallet heroes.
- **L11283 `renderWalletHeroBonusPanel`** — Render wallet hero bonus panel.
- **L11435 `renderGrid`** — Render grid.
- **L11845 `renderPortalArt`** — Render portal art.
- **L11884 `ensureAbilityInfoPopup`** — Ensure ability info popup.
- **L11907 `renderAbilityInfoPopup`** — Render ability info popup.
- **L11913 `scheduleAbilityInfoHide`** — Schedule ability info hide.
- **L11920 `hideAbilityInfo`** — Hide ability info.
- **L11928 `showAbilityInfo`** — Show ability info.
- **L11944 `setViewportUnits`** — Set viewport units.
- **L11950 `nudgeMobileChrome`** — Nudge mobile chrome.
- **L11957 `isStandaloneDisplay`** — Is standalone display.
- **L11961 `isIosHomeScreenFlow`** — Is ios home screen flow.
- **L11967 `updateMobileInstallPrompt`** — Update mobile install prompt.
- **L11989 `handleMobileInstallAction`** — Handle mobile install action.
- **L12007 `updateMobileBoardFit`** — Update mobile board fit.
- **L12056 `isLandscapeMobileUi`** — Is landscape mobile ui.
- **L12060 `updateMobileBarToggle`** — Update mobile bar toggle.
- **L12068 `toggleMobileBarCollapsed`** — Toggle mobile bar collapsed.
- **L12075 `updateMobileLeftRail`** — Update mobile left rail.
- **L12091 `toggleMobileLeftRail`** — Toggle mobile left rail.
- **L12097 `updateMobileRightRail`** — Update mobile right rail.
- **L12113 `toggleMobileRightRail`** — Toggle mobile right rail.
- **L12119 `updateMobileHireNotice`** — Update mobile hire notice.
- **L12127 `closeMobileMenus`** — Close mobile menus.
- **L12145 `toggleMobileMenu`** — Toggle mobile menu.
- **L12174 `bindMobileUpgradeHold`** — Bind mobile upgrade hold.
- **L12201 `setPanelCollapsed`** — Set panel collapsed.
- **L12207 `enforceMobileSidePanelRule`** — Enforce mobile side panel rule.
- **L12223 `enforceMobileStatsPanelRule`** — Enforce mobile stats panel rule.
- **L12228 `syncMobileHosts`** — Sync mobile hosts.
- **L12292 `bindMenuAutoClose`** — Bind menu auto close.
- **L12305 `applyMobileAbilityTileArtwork`** — Apply mobile ability tile artwork.
- **L12322 `setMobileAbilityButtonMarkup`** — Set mobile ability button markup.
- **L12332 `setMobileAbilityVisualState`** — Set mobile ability visual state.
- **L12346 `renderMobileAbilityDock`** — Render mobile ability dock.
- **L12415 `syncMobileQuickActions`** — Sync mobile quick actions.
- **L12463 `towerHasReadyMobileAbility`** — Tower has ready mobile ability.
- **L12474 `renderHeroQuickSelect`** — Render hero quick select.
- **L12506 `closeAbilityDetails`** — Close ability details.
- **L12516 `toggleAbilityDetails`** — Toggle ability details.
- **L12528 `renderSelection`** — Render selection.
- **L12636 `refreshSelectedPanelLive`** — Refresh selected panel live.
- **L12687 `getLivingHireCount`** — Get living hire count.
- **L12691 `getStandardHeroBoardCount`** — Get standard hero board count.
- **L12697 `hasReachedStandardHeroBoardCap`** — Has reached standard hero board cap.
- **L12701 `canAlwaysFieldOneWarrior`** — Can always field one warrior.
- **L12707 `isHeroTypeLocked`** — Is hero type locked.
- **L12723 `getNextHireCost`** — Get next hire cost.
- **L12728 `shouldHideWarriorHireDuringStartingPlacement`** — Should hide warrior hire during starting placement.
- **L12734 `renderHirePanel`** — Render hire panel.
- **L12769 `appendHireButton`** — Append hire button.
- **L12886 `renderRelics`** — Render relics.
- **L13029 `canPlacePortal`** — Can place portal.
- **L13039 `clearPortalTiles`** — Clear portal tiles.
- **L13049 `canRepositionWarriorPreStart`** — Can reposition warrior pre start.
- **L13053 `pickupWarriorForReposition`** — Pickup warrior for reposition.
- **L13065 `canRepositionPortal`** — Can reposition portal.
- **L13069 `pickupPortal`** — Pickup portal.
- **L13090 `placePortal`** — Place portal.
- **L13124 `canPlacePlayerObstacle`** — Can place player obstacle.
- **L13134 `placePlayerObstacle`** — Place player obstacle.
- **L13163 `canEditBarriersPreStart`** — Can edit barriers pre start.
- **L13167 `removePlayerObstacle`** — Remove player obstacle.
- **L13186 `beginBarrierRebuild`** — Begin barrier rebuild.
- **L13212 `canStartBarrierRebuild`** — Can start barrier rebuild.
- **L13223 `autoPlaceWarrior`** — Auto place warrior.
- **L13234 `placeStartingWarrior`** — Place starting warrior.
- **L13255 `portalDistance`** — Portal distance.
- **L13260 `isOpenForTower`** — Is open for tower.
- **L13265 `existsPathFromBreachToTargets`** — Exists path from breach to targets.
- **L13270 `placementKeepsEnemiesReachable`** — Placement keeps enemies reachable.
- **L13274 `createTower`** — Create tower.
- **L13337 `isNearPriest`** — Is near priest.
- **L13341 `getActiveMonks`** — Get active monks.
- **L13345 `syncMonkTrainingPartnerState`** — Sync monk training partner state.
- **L13356 `getActiveWarriorForMonkSiphon`** — Get active warrior for monk siphon.
- **L13362 `applyMonkDarkSiphon`** — Apply monk dark siphon.
- **L13371 `getSacrificePlacementTile`** — Get sacrifice placement tile.
- **L13393 `applySacrificeEverythingIfReady`** — Apply sacrifice everything if ready.
- **L13425 `isReservedGhostTile`** — Is reserved ghost tile.
- **L13429 `getBerserkerFrontlineTile`** — Get berserker frontline tile.
- **L13443 `scheduleNextBerserkerWander`** — Schedule next berserker wander.
- **L13447 `startBerserkerWander`** — Start berserker wander.
- **L13466 `returnBerserkerFromWander`** — Return berserker from wander.
- **L13486 `handleWaveClearHeroPassives`** — Handle wave clear hero passives.
- **L13502 `getAbilityIndex`** — Get ability index.
- **L13506 `getAbilityUnlockLevel`** — Get ability unlock level.
- **L13543 `isAbilityUnlocked`** — Is ability unlocked.
- **L13547 `getAbilityPowerMultiplier`** — Get ability power multiplier.
- **L13553 `getPriestDivineSoldierPrayerCooldown`** — Get priest divine soldier prayer cooldown.
- **L13560 `getAbilityCooldownSeconds`** — Get ability cooldown seconds.
- **L13585 `getUpgradeLevelCap`** — Get upgrade level cap.
- **L13589 `getAbilityLevelBonus`** — Get ability level bonus.
- **L13594 `canUpgradeTower`** — Can upgrade tower.
- **L13601 `getOwnedRelicObjects`** — Get owned relic objects.
- **L13605 `getPassiveEntries`** — Get passive entries.
- **L13634 `renderPassiveCards`** — Render passive cards.
- **L13671 `getPrayerOfHealingAmount`** — Get prayer of healing amount.
- **L13676 `getSeerPassiveHealPercent`** — Get seer passive heal percent.
- **L13683 `getChronoPurgeDamage`** — Get chrono purge damage.
- **L13688 `hasUnlockedSeerEvasion`** — Has unlocked seer evasion.
- **L13692 `collectTileTargets`** — Collect tile targets.
- **L13736 `getAbilityDescription`** — Get ability description.
- **L13807 `getUpgradeCost`** — Get upgrade cost.
- **L13829 `upgradeTower`** — Upgrade tower.
- **L13857 `getPirateCooldownMultiplierForLevel`** — Get pirate cooldown multiplier for level.
- **L13862 `getWizardCooldownMultiplierForLevel`** — Get wizard cooldown multiplier for level.
- **L13867 `getSatelliteWavesSurvived`** — Get satellite waves survived.
- **L13873 `getSatelliteDissipateAfterWaves`** — Get satellite dissipate after waves.
- **L13882 `getSatelliteFadeStageOneWaves`** — Get satellite fade stage one waves.
- **L13891 `getSatelliteFadeStageTwoWaves`** — Get satellite fade stage two waves.
- **L13900 `getSatelliteVisualOpacity`** — Get satellite visual opacity.
- **L13909 `getMaxAffordableUpgradeCount`** — Get max affordable upgrade count.
- **L13926 `getMaxAffordableUpgradeSpend`** — Get max affordable upgrade spend.
- **L13943 `upgradeTowerToCurrentCap`** — Upgrade tower to current cap.
- **L13955 `removeTower`** — Remove tower.
- **L13966 `dissipateExpiredSatelliteArchers`** — Dissipate expired satellite archers.
- **L13978 `getSelectedTower`** — Get selected tower.
- **L13982 `getActiveSatelliteCountForOwner`** — Get active satellite count for owner.
- **L13986 `isStatueTower`** — Is statue tower.
- **L13991 `removeExistingOwnedStatue`** — Remove existing owned statue.
- **L13999 `getActivePriestTotemCountForOwner`** — Get active priest totem count for owner.
- **L14003 `canTowerPlaceSatelliteNow`** — Can tower place satellite now.
- **L14015 `getSatellitePlacementCandidates`** — Get satellite placement candidates.
- **L14026 `getPreferredSatelliteTower`** — Get preferred satellite tower.
- **L14030 `cancelSatellitePlacement`** — Cancel satellite placement.
- **L14044 `beginSatellitePlacement`** — Begin satellite placement.
- **L14065 `getPendingActionLabel`** — Get pending action label.
- **L14095 `hasCancelablePendingAction`** — Has cancelable pending action.
- **L14099 `cancelPendingAction`** — Cancel pending action.
- **L14131 `handleTileClick`** — Handle tile click.
- **L14205 `placeHiredHero`** — Place hired hero.
- **L14453 `getMoveRangeForTower`** — Get move range for tower.
- **L14457 `chebyshevDist`** — Chebyshev dist.
- **L14461 `getMoveTargetsForTower`** — Get move targets for tower.
- **L14479 `getSelectedRangeTiles`** — Get selected range tiles.
- **L14497 `moveWouldPreservePath`** — Move would preserve path.
- **L14519 `moveTower`** — Move tower.
- **L14537 `existsPathFromBreachToPortal`** — Exists path from breach to portal.
- **L14543 `bfsHasPath`** — Bfs has path.
- **L14563 `isBlockedForPath`** — Is blocked for path.
- **L14574 `getSpawnTiles`** — Get spawn tiles.
- **L14580 `getPortalTargets`** — Get portal targets.
- **L14599 `getPortalFlowKey`** — Get portal flow key.
- **L14609 `ensurePortalFlowField`** — Ensure portal flow field.
- **L14636 `getPortalFlowDistance`** — Get portal flow distance.
- **L14641 `getPortalFlowStep`** — Get portal flow step.
- **L14664 `getTilesInManhattanRange`** — Get tiles in manhattan range.
- **L14675 `igniteTornSoulBurn`** — Ignite torn soul burn.
- **L14695 `updateEnemyFacingX`** — Update enemy facing x.
- **L14704 `getEnemyFacingScaleX`** — Get enemy facing scale x.
- **L14709 `moveEnemyToStep`** — Move enemy to step.
- **L14744 `knockbackEnemy`** — Knockback enemy.
- **L14801 `isEnemyHardControlled`** — Is enemy hard controlled.
- **L14805 `tryApplyStun`** — Try apply stun.
- **L14816 `performChampionDreadknightCrush`** — Perform champion dreadknight crush.
- **L14838 `getEnemyOccupancyClass`** — Get enemy occupancy class.
- **L14847 `getEnemySizeKey`** — Get enemy size key.
- **L14851 `getEnemyTileCapacity`** — Get enemy tile capacity.
- **L14858 `getEnemyOccupancy`** — Get enemy occupancy.
- **L14867 `getEnemyOccupancyPenalty`** — Get enemy occupancy penalty.
- **L14878 `pathfind`** — Pathfind.
- **L14922 `reconstructPath`** — Reconstruct path.
- **L14934 `heuristic`** — Heuristic.
- **L14938 `sanitizeWavePlan`** — Sanitize wave plan.
- **L14956 `prepareNextWave`** — Prepare next wave.
- **L14976 `buildWavePlan`** — Build wave plan.
- **L14994 `choosePattern`** — Choose pattern.
- **L15001 `chooseMutation`** — Choose mutation.
- **L15010 `chooseLane`** — Choose lane.
- **L15020 `isWaveInRange`** — Is wave in range.
- **L15048 `getEliteWaveConfig`** — Get elite wave config.
- **L15055 `isEliteWave`** — Is elite wave.
- **L15059 `getWaveSpecificEnemyCountMultiplier`** — Get wave specific enemy count multiplier.
- **L15065 `getEnemyWaveSpeedMultiplier`** — Get enemy wave speed multiplier.
- **L15069 `getStandardWaveEnemyCount`** — Get standard wave enemy count.
- **L15075 `getWaveBossOverrideCount`** — Get wave boss override count.
- **L15079 `hasPendingEliteFinalSpawn`** — Has pending elite final spawn.
- **L15083 `createSkyTerrorEnemy`** — Create sky terror enemy.
- **L15129 `releaseEliteFinalSpawn`** — Release elite final spawn.
- **L15146 `getFlyingPortalStep`** — Get flying portal step.
- **L15163 `moveFlyingEnemyToStep`** — Move flying enemy to step.
- **L15183 `addMidWaveSkitters`** — Add mid wave skitters.
- **L15201 `addExtraBosses`** — Add extra bosses.
- **L15210 `applyWaveEnemyOverrides`** — Apply wave enemy overrides.
- **L15221 `buildStandardWave`** — Build standard wave.
- **L15245 `getFlyingTerrorCountForWave`** — Get flying terror count for wave.
- **L15253 `addFlyingTerrorSupport`** — Add flying terror support.
- **L15276 `buildBossWave`** — Build boss wave.
- **L15297 `chooseEnemyType`** — Choose enemy type.
- **L15312 `cloneContinueData`** — Clone continue data.
- **L15316 `snapshotGridState`** — Snapshot grid state.
- **L15330 `applyGridSnapshot`** — Apply grid snapshot.
- **L15345 `hasAvailableContinueRetry`** — Has available continue retry.
- **L15349 `saveContinueSnapshot`** — Save continue snapshot.
- **L15417 `closeContinueOfferModal`** — Close continue offer modal.
- **L15427 `openContinueOfferModal`** — Open continue offer modal.
- **L15464 `closeStartModeModal`** — Close start mode modal.
- **L15485 `activateStartModeModalInteractive`** — Activate start mode modal interactive.
- **L15501 `primeStartModeModalBehindIntro`** — Prime start mode modal behind intro.
- **L15523 `closeGuestConnectConfirmModal`** — Close guest connect confirm modal.
- **L15536 `closeSeerIntroModal`** — Close seer intro modal.
- **L15557 `finishHowToPlayGuide`** — Finish how to play guide.
- **L15563 `isHowToPlayVisible`** — Is how to play visible.
- **L15567 `focusHowToPlayModal`** — Focus how to play modal.
- **L15577 `eventHitsHowToPlayButton`** — Event hits how to play button.
- **L15589 `openSeerIntroModal`** — Open seer intro modal.
- **L15612 `openStartModeModal`** — Open start mode modal.
- **L15636 `setStartModeNote`** — Set start mode note.
- **L15642 `primeHowToPlayModalBehindStory`** — Prime how to play modal behind story.
- **L15659 `revealPrimedHowToPlayModalAfterStory`** — Reveal primed how to play modal after story.
- **L15687 `beginModeIntroStory`** — Begin mode intro story.
- **L15704 `setBoardInputLocked`** — Set board input locked.
- **L15711 `suppressBoardClicks`** — Suppress board clicks.
- **L15715 `shouldSuppressBoardClicks`** — Should suppress board clicks.
- **L15719 `swallowModalEvent`** — Swallow modal event.
- **L15726 `stopModalPropagation`** — Stop modal propagation.
- **L15732 `chooseGuestModeFromPrompt`** — Choose guest mode from prompt.
- **L15741 `chooseConnectModeFromPrompt`** — Choose connect mode from prompt.
- **L15766 `openGuestConnectConfirmModal`** — Open guest connect confirm modal.
- **L15798 `openAnnouncementModal`** — Open announcement modal.
- **L15821 `closeAnnouncementModal`** — Close announcement modal.
- **L15828 `showNewRunStoryModal`** — Show new run story modal.
- **L15837 `showFinalGameOverModal`** — Show final game over modal.
- **L15841 `finalizePortalLoss`** — Finalize portal loss.
- **L15897 `restoreContinueSnapshot`** — Restore continue snapshot.
- **L16014 `stageUpcomingWavePlan`** — Stage upcoming wave plan.
- **L16019 `startWave`** — Start wave.
- **L16073 `getWaveHpMultiplier`** — Get wave hp multiplier.
- **L16078 `getWaveDamageMultiplier`** — Get wave damage multiplier.
- **L16083 `getWaveEnemyCountMultiplier`** — Get wave enemy count multiplier.
- **L16088 `getRunnerSpeedMultiplier`** — Get runner speed multiplier.
- **L16092 `getLargeEnemySpeedMultiplier`** — Get large enemy speed multiplier.
- **L16097 `getBruteHpMultiplier`** — Get brute hp multiplier.
- **L16101 `isEarlyWave`** — Is early wave.
- **L16105 `getEarlyWaveStatMultiplier`** — Get early wave stat multiplier.
- **L16109 `getEarlyWaveSpeedMultiplier`** — Get early wave speed multiplier.
- **L16113 `getEarlyWaveGoldMultiplier`** — Get early wave gold multiplier.
- **L16117 `getLateWaveGoldDecayMultiplier`** — Get late wave gold decay multiplier.
- **L16129 `getWaveGoldMultiplier`** — Get wave gold multiplier.
- **L16133 `getEnemyBaselineHpMultiplier`** — Get enemy baseline hp multiplier.
- **L16138 `getEnemyBaselineDamageMultiplier`** — Get enemy baseline damage multiplier.
- **L16143 `spawnEnemyFromPlan`** — Spawn enemy from plan.
- **L16212 `getPostWave15StatMultiplier`** — Get post wave15 stat multiplier.
- **L16216 `getPostWave15CountMultiplier`** — Get post wave15 count multiplier.
- **L16223 `getPostWave20EnemyDamageMultiplier`** — Get post wave20 enemy damage multiplier.
- **L16227 `getPostWave20EnemySpeedMultiplier`** — Get post wave20 enemy speed multiplier.
- **L16231 `getPostWave25BossHpMultiplier`** — Get post wave25 boss hp multiplier.
- **L16235 `getPostWave25BossDamageMultiplier`** — Get post wave25 boss damage multiplier.
- **L16239 `getPostWave25BossSpeedMultiplier`** — Get post wave25 boss speed multiplier.
- **L16243 `createEnemy`** — Create enemy.
- **L16294 `createBossEnemy`** — Create boss enemy.
- **L16336 `canEnemyEnterIgnoringCrowd`** — Can enemy enter ignoring crowd.
- **L16347 `tryResolveEnemyStall`** — Try resolve enemy stall.
- **L16378 `attemptResolveBattleStall`** — Attempt resolve battle stall.
- **L16390 `attemptRecoverWaveSoftlock`** — Attempt recover wave softlock.
- **L16425 `clearStuckWaves`** — Clear stuck waves.
- **L16466 `maintainWaveReadiness`** — Maintain wave readiness.
- **L16482 `update`** — Update.
- **L16556 `allSpawnsDone`** — All spawns done.
- **L16560 `applyWaveClearRewards`** — Apply wave clear rewards.
- **L16631 `finishWave`** — Finish wave.
- **L16695 `setCountdown`** — Set countdown.
- **L16702 `offerStartingRelic`** — Offer starting relic.
- **L16722 `offerRelics`** — Offer relics.
- **L16734 `buyRelic`** — Buy relic.
- **L16765 `buffTowerType`** — Buff tower type.
- **L16778 `ensureChampionAutoAbilityState`** — Ensure champion auto ability state.
- **L16796 `setChampionAutoAbilityCooldown`** — Set champion auto ability cooldown.
- **L16806 `getTowerAbilityGlobalReadyAt`** — Get tower ability global ready at.
- **L16810 `getTowerAbilityReadyAt`** — Get tower ability ready at.
- **L16815 `getChampionSageKissFromARoseDamage`** — Get champion sage kiss from arose damage.
- **L16822 `performChampionSageKissFromARose`** — Perform champion sage kiss from arose.
- **L16842 `performChampionSagePetalStorm`** — Perform champion sage petal storm.
- **L16862 `tryAutoCastMobileAbility`** — Try auto cast mobile ability.
- **L16875 `updateTower`** — Update tower.
- **L17159 `shouldSpellbowHoldAbilities`** — Should spellbow hold abilities.
- **L17164 `applyDaggerTrainingContact`** — Apply dagger training contact.
- **L17178 `getWarriorTowers`** — Get warrior towers.
- **L17182 `getNearestWarriorTo`** — Get nearest warrior to.
- **L17188 `getReachableWarriorPlan`** — Get reachable warrior plan.
- **L17204 `isBehindWarrior`** — Is behind warrior.
- **L17209 `autoPriestHeal`** — Auto priest heal.
- **L17240 `nearestEnemyForWarrior`** — Nearest enemy for warrior.
- **L17247 `isTileOpenForEnemyPush`** — Is tile open for enemy push.
- **L17258 `pushEnemyAwayFromTile`** — Push enemy away from tile.
- **L17282 `getPortalPriorityEnemies`** — Get portal priority enemies.
- **L17297 `getEnemyTargetRangePadding`** — Get enemy target range padding.
- **L17305 `getTowerToEnemyRangeDistance`** — Get tower to enemy range distance.
- **L17309 `nearestEnemyInRange`** — Nearest enemy in range.
- **L17331 `getPreferredStatueTarget`** — Get preferred statue target.
- **L17359 `getEnemyAggroTarget`** — Get enemy aggro target.
- **L17412 `getTowerApproachTiles`** — Get tower approach tiles.
- **L17422 `canEnemyAggroTower`** — Can enemy aggro tower.
- **L17430 `updateEnemy`** — Update enemy.
- **L17620 `getEnchantedStoneSlowPercent`** — Get enchanted stone slow percent.
- **L17632 `applyRingOfFire`** — Apply ring of fire.
- **L17647 `getEnemySlowPercent`** — Get enemy slow percent.
- **L17659 `getEnemyMoveMs`** — Get enemy move ms.
- **L17676 `canEnemyEnter`** — Can enemy enter.
- **L17692 `getTilePixelPosition`** — Get tile pixel position.
- **L17729 `createAttackLine`** — Create attack line.
- **L17741 `createProjectileEffect`** — Create projectile effect.
- **L17754 `createArcherProjectileEffect`** — Create archer projectile effect.
- **L17769 `createFireballProjectileEffect`** — Create fireball projectile effect.
- **L17805 `createRoseProjectileEffect`** — Create rose projectile effect.
- **L17847 `createSpellbowProjectileEffect`** — Create spellbow projectile effect.
- **L17890 `createDragoonSpearProjectileEffect`** — Create dragoon spear projectile effect.
- **L17928 `createDragoonOverpowerSpinEffect`** — Create dragoon overpower spin effect.
- **L17945 `createDreadknightSwordOverpowerEffect`** — Create dreadknight sword overpower effect.
- **L17962 `createBerserkerTwoHandedSwingEffect`** — Create berserker two handed swing effect.
- **L17979 `createMonkFastFistsEffect`** — Create monk fast fists effect.
- **L17996 `createSeismicWaveEffect`** — Create seismic wave effect.
- **L18012 `createCannonballProjectileEffect`** — Create cannonball projectile effect.
- **L18048 `createTowerLine`** — Create tower line.
- **L18058 `createTileFlashArea`** — Create tile flash area.
- **L18065 `createExplosionEffect`** — Create explosion effect.
- **L18084 `triggerExplodingStatue`** — Trigger exploding statue.
- **L18100 `getTowerPixelCenter`** — Get tower pixel center.
- **L18106 `getEnemyStackOffset`** — Get enemy stack offset.
- **L18120 `applyBossStormHasteAura`** — Apply boss storm haste aura.
- **L18138 `getEnemyPixelCenter`** — Get enemy pixel center.
- **L18184 `getEnemyRenderSizeMultiplier`** — Get enemy render size multiplier.
- **L18192 `renderEnemyLayer`** — Render enemy layer.
- **L18837 `getGlobalEnemyHpRange`** — Get global enemy hp range.
- **L18864 `getBossVisualPhaseIndex`** — Get boss visual phase index.
- **L18869 `getBossVisualFilter`** — Get boss visual filter.
- **L18880 `getPackbocSpritePath`** — Get packboc sprite path.
- **L18885 `createEnemySlowSnowflake`** — Create enemy slow snowflake.
- **L18896 `createEnemyLightOrbBadge`** — Create enemy light orb badge.
- **L18911 `applyVersionStamp`** — Apply version stamp.
- **L18918 `computeEnemyVisualSizeFromSpawnHp`** — Compute enemy visual size from spawn hp.
- **L18929 `getEnemyVisualSize`** — Get enemy visual size.
- **L18935 `cleanupEntities`** — Cleanup entities.
- **L18953 `awardKill`** — Award kill.
- **L18992 `damageEnemy`** — Damage enemy.
- **L19042 `damageTower`** — Damage tower.
- **L19079 `healTower`** — Heal tower.
- **L19104 `applyBuff`** — Apply buff.
- **L19108 `applyDebuff`** — Apply debuff.
- **L19112 `applyDebuffTickDamage`** — Apply debuff tick damage.
- **L19130 `tickGroundBurnEffects`** — Tick ground burn effects.
- **L19144 `tickEffects`** — Tick effects.
- **L19181 `getActiveSlowTotems`** — Get active slow totems.
- **L19187 `addSlowTotem`** — Add slow totem.
- **L19205 `getSlowTotemSlowPercent`** — Get slow totem slow percent.
- **L19217 `getBlindingLightAttackSlowPercent`** — Get blinding light attack slow percent.
- **L19229 `beginManualAbilityPlacement`** — Begin manual ability placement.
- **L19238 `placeManualAbilityAt`** — Place manual ability at.
- **L19253 `castAbility`** — Cast ability.
- **L19611 `clearPathPreview`** — Clear path preview.
- **L19615 `getLiveWaveCount`** — Get live wave count.
- **L19619 `getLiveWaveGoldBonusMultiplier`** — Get live wave gold bonus multiplier.
- **L19626 `getLiveWaveGoldBonusLabel`** — Get live wave gold bonus label.
- **L19633 `syncStartWaveBonusIndicator`** — Sync start wave bonus indicator.
- **L19646 `buyableWaveStart`** — Buyable wave start.
- **L19655 `ensureStartWaveHintEl`** — Ensure start wave hint el.
- **L19683 `getStartWaveBlockers`** — Get start wave blockers.
- **L19704 `syncStartWaveButtonState`** — Sync start wave button state.
- **L19728 `updateAutoStartButton`** — Update auto start button.
- **L19746 `armAutoStartCountdown`** — Arm auto start countdown.
- **L19765 `toggleAutoStart`** — Toggle auto start.
- **L20216 `handleBountyClaimButtonClick`** — Handle bounty claim button click.
- **L20430 `gameLoop`** — Game loop.
- **L20507 `shouldIgnoreOpaqueRuntimeEvent`** — Should ignore opaque runtime event.
- **L20633 `bind`** — Bind.
- **L20650 `hook`** — Hook.
- **L20688 `closeJewelReceivedLightwindow`** — Close jewel received lightwindow.
- **L20696 `showJewelReceivedLightwindow`** — Show jewel received lightwindow.
- **L20720 `observeRewardSentForJewelReceived`** — Observe reward sent for jewel received.
- **L20739 `getTopMenuDailyQuestBoardSnapshot`** — Get top menu daily quest board snapshot.
- **L20764 `getDailyQuestClaimedTotalStorageKey`** — Get daily quest claimed total storage key.
- **L20768 `readStoredDailyQuestClaimedJewelTotal`** — Read stored daily quest claimed jewel total.
- **L20779 `writeStoredDailyQuestClaimedJewelTotal`** — Write stored daily quest claimed jewel total.
- **L20790 `addStoredDailyQuestClaimedJewelTotal`** — Add stored daily quest claimed jewel total.
- **L20799 `getTopMenuClaimedDailyQuestJewelTotal`** — Get top menu claimed daily quest jewel total.
- **L20832 `getTopMenuDailyQuestResetText`** — Get top menu daily quest reset text.
- **L20853 `syncTopMenuWalletResources`** — Sync top menu wallet resources.
- **L20918 `installTopMenuWalletResourceSync`** — Install top menu wallet resource sync.
- **L20936 `refreshTopMenuData`** — Refresh top menu data.

## `js/avax-rails.js`

### Arrow Functions

- **L279 `renderClaimCard`** — Render claim card.
### Constant/Tables

- **L4 `BUILD_VERSION`** — Build version.
- **L6 `CONFIG`** — Config.
- **L35 `BALANCE_CACHE_KEY`** — Balance cache key.
### Event Listeners

- **L171 `toggleBtn → click`** — Handles click events on toggleBtn.
- **L448 `button → click`** — Handles click events on button.
- **L1562 `goldBtn → click`** — Handles click events on goldBtn.
- **L1563 `patchBtn → click`** — Handles click events on patchBtn.
- **L1566 `refreshClaimsBtn → click`** — Handles click events on refreshClaimsBtn.
- **L1578 `treasuryFlyoutBtn → click`** — Handles click events on treasuryFlyoutBtn.
- **L1580 `treasuryFlyoutCloseBtn → click`** — Handles click events on treasuryFlyoutCloseBtn.
- **L1582 `treasuryFlyoutBackdrop → click`** — Handles click events on treasuryFlyoutBackdrop.
- **L1584 `saveWhitelistBtn → click`** — Handles click events on saveWhitelistBtn.
- **L1586 `whitelistList → click`** — Handles click events on whitelistList.
- **L1603 `rewardClaimsBody → click`** — Handles click events on rewardClaimsBody.
- **L1693 `window → dfk-defense:wallet-state`** — Handles dfk-defense:wallet-state events on window.
- **L1698 `window → dfk-defense:tracking-state`** — Handles dfk-defense:tracking-state events on window.
- **L1722 `document → DOMContentLoaded`** — Handles DOMContentLoaded events on document.
### Functions

- **L58 `qs`** — Qs.
- **L59 `setText`** — Set text.
- **L60 `setStatus`** — Set status.
- **L65 `shortHash`** — Short hash.
- **L69 `formatAvaxFromWei`** — Format avax from wei.
- **L79 `normalizeAddress`** — Normalize address.
- **L80 `escapeHtml`** — Escape html.
- **L89 `isTreasuryWallet`** — Is treasury wallet.
- **L94 `formatShortAvaxFromWei`** — Format short avax from wei.
- **L99 `formatJewelFromWei`** — Format jewel from wei.
- **L111 `formatJewelNumberFromWei`** — Format jewel number from wei.
- **L115 `formatRewardAmount`** — Format reward amount.
- **L126 `shortWallet`** — Short wallet.
- **L131 `parseOptionalNumber`** — Parse optional number.
- **L138 `setWhitelistFormFromItem`** — Set whitelist form from item.
- **L156 `ensureTreasuryLayout`** — Ensure treasury layout.
- **L186 `getRewardSpendTimeframeLabel`** — Get reward spend timeframe label.
- **L193 `renderRewardClaimsAdmin`** — Render reward claims admin.
- **L420 `handleRewardClaimAction`** — Handle reward claim action.
- **L440 `attachDirectRewardClaimActionListeners`** — Attach direct reward claim action listeners.
- **L455 `hoistTreasuryFlyoutToBody`** — Hoist treasury flyout to body.
- **L463 `syncTreasuryFlyoutUi`** — Sync treasury flyout ui.
- **L485 `openTreasuryFlyout`** — Open treasury flyout.
- **L494 `closeTreasuryFlyout`** — Close treasury flyout.
- **L499 `updateTreasuryUi`** — Update treasury ui.
- **L538 `loadCachedBalance`** — Load cached balance.
- **L558 `saveCachedBalance`** — Save cached balance.
- **L568 `setBalance`** — Set balance.
- **L573 `buildEstimatedBalance`** — Build estimated balance.
- **L585 `isTrackingEnabled`** — Is tracking enabled.
- **L589 `isFreeWeb3RunsMode`** — Is free web3 runs mode.
- **L592 `formatNextResetLabel`** — Format next reset label.
- **L596 `balanceText`** — Balance text.
- **L603 `balanceMarkup`** — Balance markup.
- **L612 `getWallet`** — Get wallet.
- **L617 `tokenFingerprint`** — Token fingerprint.
- **L618 `isNetworkLikeError`** — Is network like error.
- **L623 `enhanceFunctionError`** — Enhance function error.
- **L634 `ensureTreasurySession`** — Ensure treasury session.
- **L653 `refreshTreasurySessionToken`** — Refresh treasury session token.
- **L667 `isTreasurySessionError`** — Is treasury session error.
- **L671 `getTrackerSessionToken`** — Get tracker session token.
- **L678 `buildTreasuryHeaders`** — Build treasury headers.
- **L687 `callFunction`** — Call function.
- **L691 `logSessionDiagnostic`** — Log session diagnostic.
- **L710 `sendRequest`** — Send request.
- **L787 `render`** — Render.
- **L857 `sendWalletPayment`** — Send wallet payment.
- **L874 `getRewardClaimItemById`** — Get reward claim item by id.
- **L883 `parseRewardAmountToWei`** — Parse reward amount to wei.
- **L891 `sendNativeRewardClaimPayout`** — Send native reward claim payout.
- **L926 `refreshTreasurySummary`** — Refresh treasury summary.
- **L940 `updateRewardClaimStatus`** — Update reward claim status.
- **L1016 `saveRewardWhitelist`** — Save reward whitelist.
- **L1042 `deleteRewardWhitelist`** — Delete reward whitelist.
- **L1065 `refreshRewardClaimsAdmin`** — Refresh reward claims admin.
- **L1102 `purchaseCustom`** — Purchase custom.
- **L1198 `refreshRunBalance`** — Refresh run balance.
- **L1238 `consumeRunAccess`** — Consume run access.
- **L1256 `buyBundleForRuns`** — Buy bundle for runs.
- **L1296 `verifyPaymentWithRetry`** — Verify payment with retry.
- **L1328 `purchaseRunBundle`** — Purchase run bundle.
- **L1372 `triggerPurchaseRunBundle`** — Trigger purchase run bundle.
- **L1381 `ensurePaidRunAccess`** — Ensure paid run access.
- **L1494 `buyPowerUp`** — Buy power up.
- **L1537 `handleWalletState`** — Handle wallet state.
- **L1549 `bindUi`** — Bind ui.
- **L1673 `getActiveRunPayment`** — Get active run payment.
- **L1677 `clearActiveRunPayment`** — Clear active run payment.
- **L1683 `init`** — Init.

## `js/layout-fixes.js`

### Event Listeners

- **L37 `document → DOMContentLoaded`** — Handles DOMContentLoaded events on document.
### Functions

- **L4 `applyRunLogState`** — Apply run log state.
- **L26 `initRunLogFixes`** — Init run log fixes.

## `js/leaderboard-flyout.js`

### Event Listeners

- **L482 `openBtn → click`** — Handles click events on openBtn.
- **L483 `closeBtn → click`** — Handles click events on closeBtn.
- **L484 `backdrop → click`** — Handles click events on backdrop.
- **L485 `document → keydown`** — Handles keydown events on document.
- **L489 `refreshBtn → click`** — Handles click events on refreshBtn.
- **L490 `currentWeekBtn → click`** — Handles click events on currentWeekBtn.
- **L494 `lastWeekBtn → click`** — Handles click events on lastWeekBtn.
- **L498 `currentDayBtn → click`** — Handles click events on currentDayBtn.
- **L503 `avaxRaffleBtn → click`** — Handles click events on avaxRaffleBtn.
- **L508 `applyRangeBtn → click`** — Handles click events on applyRangeBtn.
- **L513 `header → click`** — Handles click events on header.
- **L514 `header → keydown`** — Handles keydown events on header.
- **L522 `window → dfk:leaderboard-refresh-requested`** — Handles dfk:leaderboard-refresh-requested events on window.
- **L548 `document → DOMContentLoaded`** — Handles DOMContentLoaded events on document.
### Functions

- **L13 `el`** — El.
- **L17 `shortWallet`** — Short wallet.
- **L24 `escapeHtml`** — Escape html.
- **L33 `getSupabaseConfig`** — Get supabase config.
- **L41 `getCurrentSort`** — Get current sort.
- **L49 `getCurrentRangeRequest`** — Get current range request.
- **L58 `normalizeDateInputValue`** — Normalize date input value.
- **L63 `parseDateOnlyToUtc`** — Parse date only to utc.
- **L69 `formatDateOnlyUtc`** — Format date only utc.
- **L74 `getCurrentUtcDateOnly`** — Get current utc date only.
- **L78 `isDailyRaffleMode`** — Is daily raffle mode.
- **L83 `getCurrentRaffleType`** — Get current raffle type.
- **L87 `getCurrentRaffleLabel`** — Get current raffle label.
- **L91 `getDailyRaffleQualifiedWaveCount`** — Get daily raffle qualified wave count.
- **L95 `getCurrentUtcDayBounds`** — Get current utc day bounds.
- **L103 `parseIsoMs`** — Parse iso ms.
- **L109 `isWithinCurrentUtcDay`** — Is within current utc day.
- **L117 `formatRangeLabel`** — Format range label.
- **L131 `buildFunctionUrl`** — Build function url.
- **L141 `fetchFunctionJson`** — Fetch function json.
- **L173 `normalizeRow`** — Normalize row.
- **L191 `compareValues`** — Compare values.
- **L202 `compareRows`** — Compare rows.
- **L223 `syncFlyoutSizing`** — Sync flyout sizing.
- **L232 `renderRows`** — Render rows.
- **L264 `updateHeaderSortIndicators`** — Update header sort indicators.
- **L277 `updatePeriodButtons`** — Update period buttons.
- **L289 `updateDailyRaffleUi`** — Update daily raffle ui.
- **L311 `updateRangeInputs`** — Update range inputs.
- **L319 `updateRangeDisplay`** — Update range display.
- **L337 `buildLeaderboardParams`** — Build leaderboard params.
- **L348 `loadLeaderboardRows`** — Load leaderboard rows.
- **L363 `refreshLeaderboard`** — Refresh leaderboard.
- **L409 `setOpenState`** — Set open state.
- **L421 `setSort`** — Set sort.
- **L434 `setRange`** — Set range.
- **L444 `applyCustomRange`** — Apply custom range.
- **L471 `bindEvents`** — Bind events.
- **L527 `initDefaultRange`** — Init default range.
- **L536 `init`** — Init.

## `js/multi-chain-rails.js`

### Constant/Tables

- **L3 `DFK_CHAIN_ID`** — Dfk chain id.
- **L4 `AVAX_CHAIN_ID`** — Avax chain id.
### Event Listeners

- **L28 `window → dfk-defense:wallet-state`** — Handles dfk-defense:wallet-state events on window.
- **L29 `window → dfk-defense:tracking-state`** — Handles dfk-defense:tracking-state events on window.
- **L32 `document → DOMContentLoaded`** — Handles DOMContentLoaded events on document.
### Functions

- **L5 `qs`** — Qs.
- **L6 `getWalletState`** — Get wallet state.
- **L11 `getChainId`** — Get chain id.
- **L15 `isAvaxChain`** — Is avax chain.
- **L16 `isDfkChain`** — Is dfk chain.
- **L17 `renderBankMode`** — Render bank mode.
- **L26 `init`** — Init.

## `js/run-tracker.js`

### Constant/Tables

- **L4 `CONFIG`** — Config.
- **L20 `SESSION_TOKEN_STORAGE_KEY`** — Session token storage key.
- **L21 `GLOBAL_QUEUE_STORAGE_KEY`** — Global queue storage key.
- **L22 `QUEUE_RECORD_VERSION`** — Queue record version.
- **L173 `MAX_UPLOADED_QUEUE_RECORDS`** — Max uploaded queue records.
### Event Listeners

- **L1716 `ui.saveVanityBtn → click`** — Handles click events on ui.saveVanityBtn.
- **L1721 `ui.enableBtn → click`** — Handles click events on ui.enableBtn.
- **L1742 `ui.disableBtn → click`** — Handles click events on ui.disableBtn.
- **L1754 `ui.clearStuckWavesBtn → click`** — Handles click events on ui.clearStuckWavesBtn.
- **L1795 `window → dfk-defense:wallet-state`** — Handles dfk-defense:wallet-state events on window.
- **L1798 `window → online`** — Handles online events on window.
- **L1799 `window → focus`** — Handles focus events on window.
- **L1800 `document → visibilitychange`** — Handles visibilitychange events on document.
- **L1803 `window → pageshow`** — Handles pageshow events on window.
- **L1826 `document → DOMContentLoaded`** — Handles DOMContentLoaded events on document.
### Functions

- **L24 `persistSessionToken`** — Persist session token.
- **L48 `qs`** — Qs.
- **L49 `normalizeAddress`** — Normalize address.
- **L50 `setText`** — Set text.
- **L51 `nowMs`** — Now ms.
- **L52 `tokenFingerprint`** — Token fingerprint.
- **L54 `sessionStorageKey`** — Session storage key.
- **L58 `getQueueStorageKey`** — Get queue storage key.
- **L62 `applyStatus`** — Apply status.
- **L68 `render`** — Render.
- **L103 `getWalletState`** — Get wallet state.
- **L109 `isSessionStale`** — Is session stale.
- **L119 `restoreSession`** — Restore session.
- **L136 `persistSession`** — Persist session.
- **L145 `clearSession`** — Clear session.
- **L154 `parseQueuePayload`** — Parse queue payload.
- **L164 `readQueue`** — Read queue.
- **L175 `compactReplayDataForQueue`** — Compact replay data for queue.
- **L201 `compactQueuePayloadForStorage`** — Compact queue payload for storage.
- **L211 `compactQueueRecordsForStorage`** — Compact queue records for storage.
- **L231 `writeQueue`** — Write queue.
- **L250 `getQueueForAddress`** — Get queue for address.
- **L255 `getPendingQueueCount`** — Get pending queue count.
- **L260 `clearQueueForAddress`** — Clear queue for address.
- **L270 `clearRecentSubmissionMarker`** — Clear recent submission marker.
- **L280 `clearWalletQueueState`** — Clear wallet queue state.
- **L299 `makeQueueId`** — Make queue id.
- **L304 `requiresSecureSubmission`** — Requires secure submission.
- **L312 `countQueueByStatus`** — Count queue by status.
- **L320 `getPendingSecureCount`** — Get pending secure count.
- **L324 `buildStatusText`** — Build status text.
- **L341 `toBase64Url`** — To base64 url.
- **L348 `canonicalize`** — Canonicalize.
- **L362 `sanitizeInt`** — Sanitize int.
- **L368 `sliceText`** — Slice text.
- **L373 `clampInt`** — Clamp int.
- **L382 `hardenRunStatsForSubmission`** — Harden run stats for submission.
- **L516 `sha256Base64Url`** — Sha256 base64 url.
- **L523 `backoffDelayMs`** — Backoff delay ms.
- **L528 `upsertQueuedRun`** — Upsert queued run.
- **L576 `markQueuedRunUploaded`** — Mark queued run uploaded.
- **L592 `updateQueueStatus`** — Update queue status.
- **L606 `attachSecureSubmission`** — Attach secure submission.
- **L626 `markQueuedRunFailed`** — Mark queued run failed.
- **L644 `purgeUploadedQueueRecords`** — Purge uploaded queue records.
- **L653 `callFunction`** — Call function.
- **L704 `isAuthErrorMessage`** — Is auth error message.
- **L708 `isRetryableUploadError`** — Is retryable upload error.
- **L718 `waitMs`** — Wait ms.
- **L724 `submitTrackedRunWithRetry`** — Submit tracked run with retry.
- **L740 `coerceIsoDate`** — Coerce iso date.
- **L747 `makeRunClientId`** — Make run client id.
- **L754 `normalizeQueuedRunPayload`** — Normalize queued run payload.
- **L802 `buildSecurePayloadForHash`** — Build secure payload for hash.
- **L823 `requestSecureRunSignature`** — Request secure run signature.
- **L856 `isRepairableRunPayloadError`** — Is repairable run payload error.
- **L862 `isLegacyQueuedRun`** — Is legacy queued run.
- **L870 `buildRetryPayload`** — Build retry payload.
- **L904 `persistRepairedQueueItem`** — Persist repaired queue item.
- **L927 `attemptAutomaticQueuedRunRepair`** — Attempt automatic queued run repair.
- **L971 `debugSession`** — Debug session.
- **L1022 `ensureAuthenticatedSession`** — Ensure authenticated session.
- **L1042 `buildLoginMessage`** — Build login message.
- **L1059 `disableTracking`** — Disable tracking.
- **L1106 `getTrackingAddress`** — Get tracking address.
- **L1110 `isTrackingEnabled`** — Is tracking enabled.
- **L1122 `shouldWarnBeforeEnable`** — Should warn before enable.
- **L1126 `hasMeaningfulUntrackedGameInProgress`** — Has meaningful untracked game in progress.
- **L1136 `restartGameForTrackingIfNeeded`** — Restart game for tracking if needed.
- **L1142 `authenticate`** — Authenticate.
- **L1230 `refreshSummary`** — Refresh summary.
- **L1273 `uploadQueuedRun`** — Upload queued run.
- **L1444 `notifyTrackingDataChanged`** — Notify tracking data changed.
- **L1454 `processPendingRuns`** — Process pending runs.
- **L1496 `flushPendingRunsSoon`** — Flush pending runs soon.
- **L1513 `scheduleQueueFlush`** — Schedule queue flush.
- **L1526 `submitCompletedRun`** — Submit completed run.
- **L1579 `submitCompletedRunKeepalive`** — Submit completed run keepalive.
- **L1638 `handleWalletState`** — Handle wallet state.
- **L1667 `saveVanityName`** — Save vanity name.
- **L1705 `bindUi`** — Bind ui.
- **L1787 `init`** — Init.

## `js/security-wallet.js`

### Arrow Functions

- **L275 `tryProvider`** — Try provider.
### Constant/Tables

- **L4 `DFK_CONFIG`** — Dfk config.
- **L17 `AVAX_CONFIG`** — Avax config.
- **L27 `CONFIG`** — Config.
- **L34 `SUPPORTED_CHAINS`** — Supported chains.
- **L36 `CONTRACTS`** — Contracts.
- **L44 `PROFILES_ABI`** — Profiles abi.
- **L51 `ERC20_ABI`** — Erc20 abi.
- **L56 `HERO_CORE_TRANSFER_ABI`** — Hero core transfer abi.
### Event Listeners

- **L465 `window → eip6963:announceProvider`** — Handles eip6963:announceProvider events on window.
- **L690 `ui.connectWalletBtn → click`** — Handles click events on ui.connectWalletBtn.
- **L691 `ui.disconnectWalletBtn → click`** — Handles click events on ui.disconnectWalletBtn.
- **L716 `document → DOMContentLoaded`** — Handles DOMContentLoaded events on document.
### Functions

- **L85 `qs`** — Qs.
- **L86 `shortAddress`** — Short address.
- **L90 `setText`** — Set text.
- **L91 `emitWalletState`** — Emit wallet state.
- **L108 `setHtml`** — Set html.
- **L109 `normalizeAddress`** — Normalize address.
- **L111 `formatNativeBalance`** — Format native balance.
- **L119 `getSupportedChainConfigByHex`** — Get supported chain config by hex.
- **L124 `getProviderChainConfig`** — Get provider chain config.
- **L142 `applyActiveChainConfig`** — Apply active chain config.
- **L150 `formatEtherFromHex`** — Format ether from hex.
- **L162 `formatTokenBalance`** — Format token balance.
- **L171 `withRpcFallback`** — With rpc fallback.
- **L187 `fetchNativeBalance`** — Fetch native balance.
- **L194 `fetchErc20Balance`** — Fetch erc20 balance.
- **L219 `fetchDfkgoldBalance`** — Fetch dfkgold balance.
- **L223 `fetchHonkBalance`** — Fetch honk balance.
- **L227 `resolveProfileNameViaFunction`** — Resolve profile name via function.
- **L248 `cleanName`** — Clean name.
- **L253 `getErrorMessage`** — Get error message.
- **L266 `isNoProfileLookupMiss`** — Is no profile lookup miss.
- **L271 `resolveProfileNameViaRpc`** — Resolve profile name via rpc.
- **L335 `fetchProfileNameFromChain`** — Fetch profile name from chain.
- **L341 `fetchProfileName`** — Fetch profile name.
- **L348 `transferHeroes`** — Transfer heroes.
- **L381 `refreshWalletDetails`** — Refresh wallet details.
- **L414 `providerLabel`** — Provider label.
- **L423 `matchesProvider`** — Matches provider.
- **L434 `announceHandler`** — Announce handler.
- **L447 `addLegacyProvider`** — Add legacy provider.
- **L463 `collectProviders`** — Collect providers.
- **L479 `discoverProviders`** — Discover providers.
- **L492 `request`** — Request.
- **L496 `ensureChain`** — Ensure chain.
- **L507 `retryPendingRunUploadsForConnectedWallet`** — Retry pending run uploads for connected wallet.
- **L537 `connectWallet`** — Connect wallet.
- **L564 `chooseProvider`** — Choose provider.
- **L572 `bindProviderEvents`** — Bind provider events.
- **L607 `signIn`** — Sign in.
- **L613 `refreshBank`** — Refresh bank.
- **L627 `depositJewel`** — Deposit jewel.
- **L633 `disconnectWallet`** — Disconnect wallet.
- **L642 `renderInfo`** — Render info.
- **L647 `renderError`** — Render error.
- **L652 `render`** — Render.
- **L676 `bindUi`** — Bind ui.
- **L695 `init`** — Init.

## `styles.css`

### Css Selectors

- **L1 `:root`** — Styles matching UI elements.
- **L21 `*`** — Styles matching UI elements.
- **L22 `html, body`** — Styles matching UI elements.
- **L27 `button`** — Styles matching UI elements.
- **L31 `body`** — Styles matching UI elements.
- **L42 `body::before`** — Styles matching UI elements.
- **L51 `#app`** — Styles matching UI elements.
- **L58 `.panel`** — Styles matching UI elements.
- **L65 `.topbar`** — Styles matching UI elements.
- **L74 `.topbar > div`** — Styles matching UI elements.
- **L86 `.footer-topbar`** — Styles matching UI elements.
- **L91 `.footer-topbar strong`** — Styles matching UI elements.
- **L94 `.footer-topbar span`** — Styles matching UI elements.
- **L98 `.main-layout`** — Styles matching UI elements.
- **L105 `.left-panel, .right-panel, .bottom-panel`** — Styles matching UI elements.
- **L109 `.speed-toggle`** — Styles matching UI elements.
- **L122 `.speed-toggle:hover`** — Styles matching UI elements.
- **L123 `.speed-toggle.active`** — Styles matching UI elements.
- **L128 `.speed-toggle:focus-visible`** — Styles matching UI elements.
- **L130 `.mobile-toggle`** — Styles matching UI elements.
- **L143 `.mobile-toggle:hover`** — Styles matching UI elements.
- **L144 `.mobile-toggle.active`** — Styles matching UI elements.
- **L149 `.mobile-toggle:focus-visible`** — Styles matching UI elements.
- **L151 `.right-panel`** — Styles matching UI elements.
- **L155 `.hero-quick-select`** — Styles matching UI elements.
- **L162 `.hero-quick-btn`** — Styles matching UI elements.
- **L176 `.hero-quick-btn.has-ready-ability::after`** — Styles matching UI elements.
- **L188 `.hero-quick-btn.is-selected`** — Styles matching UI elements.
- **L193 `.hero-quick-empty`** — Styles matching UI elements.
- **L199 `.center-panel`** — Styles matching UI elements.
- **L207 `.grid`** — Styles matching UI elements.
- **L217 `.tile`** — Styles matching UI elements.
- **L234 `.tile:hover`** — Styles matching UI elements.
- **L235 `.tile *`** — Styles matching UI elements.
- **L237 `.tile.spawn`** — Styles matching UI elements.
- **L238 `.tile.portal`** — Styles matching UI elements.
- **L239 `.tile.random-obstacle`** — Styles matching UI elements.
- **L242 `.tile.random-obstacle::after`** — Styles matching UI elements.
- **L249 `.tile.player-obstacle`** — Styles matching UI elements.
- **L250 `.tile.preview-valid`** — Styles matching UI elements.
- **L251 `.tile.preview-invalid`** — Styles matching UI elements.
- **L252 `.tile.selected`** — Styles matching UI elements.
- **L253 `.tile.move-target`** — Styles matching UI elements.
- **L254 `.tile.attacking`** — Styles matching UI elements.
- **L256 `.tile.range-tile::before`** — Styles matching UI elements.
- **L264 `.tile.range-warrior::before`** — Styles matching UI elements.
- **L265 `.tile.range-archer::before`** — Styles matching UI elements.
- **L266 `.tile.range-wizard::before`** — Styles matching UI elements.
- **L267 `.tile.range-seer::before`** — Styles matching UI elements.
- **L268 `.tile.range-priest::before`** — Styles matching UI elements.
- **L269 `.tile.range-pirate::before`** — Styles matching UI elements.
- **L270 `.tile.range-monk::before`** — Styles matching UI elements.
- **L271 `.tile.range-berserker::before`** — Styles matching UI elements.
- **L274 `.tile.hit-warrior`** — Styles matching UI elements.
- **L275 `.tile.hit-archer`** — Styles matching UI elements.
- **L276 `.tile.hit-wizard`** — Styles matching UI elements.
- **L277 `.tile.hit-seer`** — Styles matching UI elements.
- **L278 `.tile.hit-priest`** — Styles matching UI elements.
- **L279 `.tile.hit-pirate`** — Styles matching UI elements.
- **L281 `.hit-flash`** — Styles matching UI elements.
- **L288 `.hit-flash-warrior`** — Styles matching UI elements.
- **L289 `.hit-flash-archer`** — Styles matching UI elements.
- **L290 `.hit-flash-wizard`** — Styles matching UI elements.
- **L291 `.hit-flash-seer`** — Styles matching UI elements.
- **L292 `.hit-flash-priest`** — Styles matching UI elements.
- **L293 `.hit-flash-pirate`** — Styles matching UI elements.
- **L295 `.hit-text`** — Styles matching UI elements.
- **L308 `.hit-text-small`** — Styles matching UI elements.
- **L314 `.hit-text-center`** — Styles matching UI elements.
### Css Blocks

- **L322 `@keyframes hitPulse`** — Styles matching UI elements.
### Css Selectors

- **L323 `0%`** — Styles matching UI elements.
- **L324 `100%`** — Styles matching UI elements.
### Css Blocks

- **L327 `@keyframes floatFade`** — Styles matching UI elements.
### Css Selectors

- **L328 `0%`** — Styles matching UI elements.
- **L329 `100%`** — Styles matching UI elements.
- **L332 `.tile-label`** — Styles matching UI elements.
- **L345 `.tower-chip`** — Styles matching UI elements.
- **L358 `.tower-warrior`** — Styles matching UI elements.
- **L359 `.tile-hero-warrior`** — Styles matching UI elements.
- **L360 `.tile-hero-archer`** — Styles matching UI elements.
- **L361 `.tile-hero-wizard`** — Styles matching UI elements.
- **L362 `.tile-hero-seer`** — Styles matching UI elements.
- **L363 `.tile-hero-priest`** — Styles matching UI elements.
- **L364 `.tile-hero-pirate`** — Styles matching UI elements.
- **L365 `.tower-archer`** — Styles matching UI elements.
- **L366 `.tower-wizard`** — Styles matching UI elements.
- **L367 `.tower-priest`** — Styles matching UI elements.
- **L368 `.tower-pirate`** — Styles matching UI elements.
- **L370 `.hp-bar, .cooldown-bar`** — Styles matching UI elements.
- **L379 `.hp-bar`** — Styles matching UI elements.
- **L380 `.cooldown-bar`** — Styles matching UI elements.
- **L381 `.hp-fill`** — Styles matching UI elements.
- **L382 `.cooldown-fill`** — Styles matching UI elements.
- **L384 `.enemy-stack`** — Styles matching UI elements.
- **L394 `.enemy-dot`** — Styles matching UI elements.
- **L400 `.enemy-grunt`** — Styles matching UI elements.
- **L401 `.enemy-runner`** — Styles matching UI elements.
- **L402 `.enemy-brute`** — Styles matching UI elements.
- **L403 `.enemy-boss`** — Styles matching UI elements.
- **L404 `.enemy-packboc`** — Styles matching UI elements.
- **L405 `.enemy-slowed`** — Styles matching UI elements.
- **L406 `.enemy-boss.enemy-slowed`** — Styles matching UI elements.
- **L409 `.enemy-slow-snowflake`** — Styles matching UI elements.
- **L418 `.enemy-slow-snowflake.boss-slow-snowflake`** — Styles matching UI elements.
- **L422 `.phase-label`** — Styles matching UI elements.
- **L428 `.instruction`** — Styles matching UI elements.
- **L434 `.log`** — Styles matching UI elements.
- **L443 `.log-entry`** — Styles matching UI elements.
- **L448 `.selected-info`** — Styles matching UI elements.
- **L457 `.action-group`** — Styles matching UI elements.
- **L463 `.right-panel h3`** — Styles matching UI elements.
- **L467 `.abilities-panel, .card-list`** — Styles matching UI elements.
- **L473 `.card`** — Styles matching UI elements.
- **L479 `.card h4`** — Styles matching UI elements.
- **L483 `.card p`** — Styles matching UI elements.
- **L489 `.bottom-panel`** — Styles matching UI elements.
- **L497 `.controls-row`** — Styles matching UI elements.
- **L503 `.action-row`** — Styles matching UI elements.
- **L506 `.controls-stack`** — Styles matching UI elements.
- **L512 `.control-section h3`** — Styles matching UI elements.
- **L515 `.hire-list`** — Styles matching UI elements.
- **L522 `.hire-list .card`** — Styles matching UI elements.
- **L525 `.hire-section`** — Styles matching UI elements.
- **L528 `.hire-list`** — Styles matching UI elements.
- **L532 `.hire-list .card`** — Styles matching UI elements.
- **L535 `.relic-list`** — Styles matching UI elements.
- **L542 `button`** — Styles matching UI elements.
- **L551 `.small-action`** — Styles matching UI elements.
- **L558 `button.secondary`** — Styles matching UI elements.
- **L559 `button.buy-btn`** — Styles matching UI elements.
- **L560 `button.warn`** — Styles matching UI elements.
- **L561 `button:disabled`** — Styles matching UI elements.
- **L566 `.banner`** — Styles matching UI elements.
- **L579 `.hidden`** — Styles matching UI elements.
- **L580 `.muted`** — Styles matching UI elements.
- **L581 `.good`** — Styles matching UI elements.
- **L582 `.bad`** — Styles matching UI elements.
- **L583 `.gold`** — Styles matching UI elements.
### Css Blocks

- **L585 `@media (max-width: 1280px)`** — Styles matching UI elements.
### Css Selectors

- **L586 `.main-layout`** — Styles matching UI elements.
- **L587 `.topbar`** — Styles matching UI elements.
- **L590 `.footer-info`** — Styles matching UI elements.
- **L601 `.panel-lite`** — Styles matching UI elements.
- **L606 `.footer-info .phase-label`** — Styles matching UI elements.
- **L610 `.footer-info .instruction`** — Styles matching UI elements.
- **L619 `.ability-row`** — Styles matching UI elements.
- **L620 `.ability-row button`** — Styles matching UI elements.
- **L621 `.ability-row button.ability-info-icon`** — Styles matching UI elements.
- **L622 `.ability-info-icon`** — Styles matching UI elements.
- **L623 `.locked-skill`** — Styles matching UI elements.
- **L624 `.relic-pill`** — Styles matching UI elements.
- **L625 `.selected-relics`** — Styles matching UI elements.
- **L626 `.relic-owned-card`** — Styles matching UI elements.
- **L629 `.ability-banner`** — Styles matching UI elements.
- **L636 `.tile-hover-card`** — Styles matching UI elements.
- **L639 `.tile-hover-title`** — Styles matching UI elements.
- **L646 `.tile-hover-skill`** — Styles matching UI elements.
- **L652 `.tile-hover-skill.locked`** — Styles matching UI elements.
- **L657 `.enemy-layer`** — Styles matching UI elements.
- **L665 `.attack-line-layer`** — Styles matching UI elements.
- **L670 `.attack-line`** — Styles matching UI elements.
- **L675 `.attack-line-warrior`** — Styles matching UI elements.
- **L676 `.attack-line-archer`** — Styles matching UI elements.
- **L677 `.attack-line-wizard`** — Styles matching UI elements.
- **L678 `.attack-line-seer`** — Styles matching UI elements.
- **L679 `.attack-line-priest`** — Styles matching UI elements.
- **L680 `.attack-line-pirate`** — Styles matching UI elements.
- **L681 `.attack-line-default`** — Styles matching UI elements.
- **L682 `.enemy-floating`** — Styles matching UI elements.
- **L687 `.enemy-floating.attacking`** — Styles matching UI elements.
- **L690 `.tile-hover-card`** — Styles matching UI elements.
- **L694 `.tile:hover .tile-hover-card`** — Styles matching UI elements.
- **L699 `.tile-hover-skills`** — Styles matching UI elements.
- **L705 `.tile-hover-skill-btn`** — Styles matching UI elements.
- **L718 `.tile-hover-skill-btn:hover:not(:disabled)`** — Styles matching UI elements.
- **L723 `.tile-hover-skill-btn:disabled, .tile-hover-skill-btn.locked`** — Styles matching UI elements.
### Css Blocks

- **L730 `@media (max-width: 1100px)`** — Styles matching UI elements.
### Css Selectors

- **L731 `.hire-list, .relic-list`** — Styles matching UI elements.
- **L736 `.action-group button`** — Styles matching UI elements.
- **L741 `.abilities-panel button`** — Styles matching UI elements.
- **L745 `.left-panel h2`** — Styles matching UI elements.
- **L749 `.tile:hover .tile-hover-card`** — Styles matching UI elements.
- **L756 `.crash-panel`** — Styles matching UI elements.
- **L770 `.crash-panel-header`** — Styles matching UI elements.
- **L776 `.crash-close`** — Styles matching UI elements.
- **L783 `.crash-panel-body`** — Styles matching UI elements.
- **L788 `.crash-summary`** — Styles matching UI elements.
- **L792 `.crash-state, .crash-error, .crash-events`** — Styles matching UI elements.
- **L800 `.crash-error`** — Styles matching UI elements.
- **L807 `.crash-panel-actions`** — Styles matching UI elements.
- **L813 `.ability-info-popup`** — Styles matching UI elements.
- **L825 `.ability-info-popup.hidden`** — Styles matching UI elements.
- **L828 `.ability-info-popup .ability-banner`** — Styles matching UI elements.
- **L834 `.passive-card`** — Styles matching UI elements.
- **L839 `.passive-card h4`** — Styles matching UI elements.
- **L843 `.passive-name`** — Styles matching UI elements.
- **L849 `.passive-subtitle`** — Styles matching UI elements.
- **L854 `.passive-card-locked`** — Styles matching UI elements.
### Css Blocks

- **L858 `@media (max-width: 1100px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L859 `:root`** — Styles matching UI elements.
- **L864 `#app`** — Styles matching UI elements.
- **L868 `.main-layout`** — Styles matching UI elements.
- **L872 `.center-panel`** — Styles matching UI elements.
- **L877 `.left-panel`** — Styles matching UI elements.
- **L880 `.right-panel`** — Styles matching UI elements.
- **L883 `.left-panel, .right-panel, .bottom-panel`** — Styles matching UI elements.
- **L886 `.topbar`** — Styles matching UI elements.
- **L890 `.footer-topbar`** — Styles matching UI elements.
- **L893 `.controls-row.action-row`** — Styles matching UI elements.
- **L897 `.control-section.hire-section .hire-list, .control-section.relic-section .relic-list`** — Styles matching UI elements.
- **L901 `.log`** — Styles matching UI elements.
- **L904 `.selected-info, .abilities-panel`** — Styles matching UI elements.
- **L910 `.pause-toggle`** — Styles matching UI elements.
- **L923 `.pause-toggle:hover`** — Styles matching UI elements.
- **L924 `.pause-toggle.active`** — Styles matching UI elements.
- **L929 `.portal-art`** — Styles matching UI elements.
- **L937 `.portal-art.hidden`** — Styles matching UI elements.
- **L939 `.portal-art.portal-art-damaged`** — Styles matching UI elements.
### Css Blocks

- **L946 `@keyframes portalDamagePulse`** — Styles matching UI elements.
### Css Selectors

- **L947 `0%`** — Styles matching UI elements.
- **L948 `50%`** — Styles matching UI elements.
- **L949 `100%`** — Styles matching UI elements.
- **L953 `.tile.random-obstacle .tile-label`** — Styles matching UI elements.
- **L954 `.tile.player-obstacle .tile-label`** — Styles matching UI elements.
- **L956 `.tile.player-obstacle::after`** — Styles matching UI elements.
- **L963 `.tile.random-obstacle::after`** — Styles matching UI elements.
- **L970 `.tile.player-obstacle .tile-label`** — Styles matching UI elements.
- **L972 `/* FORCE visible tree + rock sprites */ .tile.player-obstacle`** — Styles matching UI elements.
- **L976 `.tile.player-obstacle::after`** — Styles matching UI elements.
- **L984 `.tile.random-obstacle`** — Styles matching UI elements.
- **L987 `.tile.random-obstacle::after`** — Styles matching UI elements.
- **L995 `.passive-active-note`** — Styles matching UI elements.
- **L1005 `.enemy-hp-bar`** — Styles matching UI elements.
- **L1016 `.enemy-hp-fill`** — Styles matching UI elements.
- **L1021 `/* gold/jewel update + relic popup */ .left-panel .meta-currency`** — Styles matching UI elements.
- **L1028 `.meta-title`** — Styles matching UI elements.
- **L1029 `.meta-rewards`** — Styles matching UI elements.
- **L1030 `.center-panel`** — Styles matching UI elements.
- **L1035 `.grid`** — Styles matching UI elements.
- **L1038 `.tile`** — Styles matching UI elements.
- **L1042 `.tile.portal`** — Styles matching UI elements.
- **L1045 `.relic-section`** — Styles matching UI elements.
- **L1046 `.relic-modal`** — Styles matching UI elements.
- **L1055 `.relic-modal.hidden`** — Styles matching UI elements.
- **L1056 `.relic-modal-card`** — Styles matching UI elements.
- **L1062 `.relic-modal-title`** — Styles matching UI elements.
- **L1069 `/* repeat patch: darker tiles + stronger hero tint */ .tile`** — Styles matching UI elements.
- **L1073 `.tile.portal`** — Styles matching UI elements.
- **L1076 `.tile-hero-warrior`** — Styles matching UI elements.
- **L1077 `.tile-hero-archer`** — Styles matching UI elements.
- **L1078 `.tile-hero-wizard`** — Styles matching UI elements.
- **L1079 `.tile-hero-seer`** — Styles matching UI elements.
- **L1080 `.tile-hero-priest`** — Styles matching UI elements.
- **L1081 `.tile-hero-pirate`** — Styles matching UI elements.
- **L1083 `/* latest tweak: darker tiles + single tree color */ .tile`** — Styles matching UI elements.
- **L1087 `.tile.portal`** — Styles matching UI elements.
- **L1091 `/* latest fix: remove selected title spacing and stop page jump */ .right-panel`** — Styles matching UI elements.
- **L1101 `.selected-info`** — Styles matching UI elements.
- **L1106 `.abilities-panel`** — Styles matching UI elements.
- **L1113 `.passive-card p, .selected-info, .ability-banner`** — Styles matching UI elements.
- **L1117 `.tile.spawn`** — Styles matching UI elements.
- **L1123 `/* latest visual pass */ body`** — Styles matching UI elements.
- **L1128 `.tile`** — Styles matching UI elements.
- **L1131 `.tile.portal`** — Styles matching UI elements.
- **L1134 `.tile.player-obstacle`** — Styles matching UI elements.
- **L1137 `.tile.player-obstacle::after`** — Styles matching UI elements.
- **L1144 `.tile.random-obstacle`** — Styles matching UI elements.
- **L1147 `.tile.random-obstacle::after`** — Styles matching UI elements.
- **L1154 `.tile.spawn`** — Styles matching UI elements.
- **L1158 `/* request pass: darker tiles, bigger enemies, distinct ability visuals */ .tile`** — Styles matching UI elements.
- **L1162 `.tile.portal`** — Styles matching UI elements.
- **L1165 `.enemy-dot`** — Styles matching UI elements.
- **L1169 `.enemy-hp-bar`** — Styles matching UI elements.
- **L1174 `.attack-line-wizard-fireball`** — Styles matching UI elements.
- **L1179 `.attack-line-archer-multishot`** — Styles matching UI elements.
- **L1186 `/* status overlay stacked below the battlefield */ .center-panel`** — Styles matching UI elements.
- **L1193 `.grid`** — Styles matching UI elements.
- **L1197 `.status-overlay`** — Styles matching UI elements.
- **L1229 `.status-overlay.hidden`** — Styles matching UI elements.
- **L1233 `.status-overlay .phase-label`** — Styles matching UI elements.
- **L1239 `.status-overlay .instruction`** — Styles matching UI elements.
- **L1244 `.bottom-panel`** — Styles matching UI elements.
- **L1249 `/* tweak pass: easy/challenge labels, obstacle darkness retained */ .tile.player-obstacle, .tile.random-obstacle`** — Styles matching UI elements.
- **L1254 `.tile.player-obstacle::after, .tile.random-obstacle::after`** — Styles matching UI elements.
- **L1260 `.tile.player-obstacle::before, .tile.random-obstacle::before`** — Styles matching UI elements.
- **L1269 `.tile-label, .tile-hp, .tile-charge, .tile-effect, .tile-path-preview`** — Styles matching UI elements.
- **L1278 `.wallet-panel`** — Styles matching UI elements.
- **L1283 `.wallet-panel-toggle`** — Styles matching UI elements.
- **L1295 `.wallet-panel-toggle .meta-title`** — Styles matching UI elements.
- **L1298 `.wallet-panel-chevron`** — Styles matching UI elements.
- **L1303 `.wallet-panel-body`** — Styles matching UI elements.
- **L1306 `.wallet-panel.collapsed .wallet-panel-body`** — Styles matching UI elements.
- **L1309 `.wallet-panel.collapsed .wallet-panel-chevron`** — Styles matching UI elements.
- **L1313 `#avaxTreasuryPanel.hidden`** — Styles matching UI elements.
- **L1317 `#avaxTreasuryPanel .wallet-panel-body`** — Styles matching UI elements.
- **L1322 `#avaxTreasuryTotal`** — Styles matching UI elements.
- **L1326 `#avaxTreasuryStatus`** — Styles matching UI elements.
- **L1330 `#avaxTreasuryPanel.collapsed .wallet-panel-body`** — Styles matching UI elements.
- **L1335 `#bankPanel .wallet-panel-toggle`** — Styles matching UI elements.
- **L1338 `#bankPanel .bank-panel-body`** — Styles matching UI elements.
- **L1343 `#bankPanel.collapsed .bank-panel-body`** — Styles matching UI elements.
- **L1346 `#bankPanel.collapsed .wallet-panel-chevron`** — Styles matching UI elements.
- **L1349 `.wallet-status`** — Styles matching UI elements.
- **L1358 `.wallet-status.wallet-good::before`** — Styles matching UI elements.
- **L1366 `.wallet-panel-title-row`** — Styles matching UI elements.
- **L1372 `.wallet-panel-title-row .meta-title`** — Styles matching UI elements.
- **L1375 `.wallet-vanity-section.hidden`** — Styles matching UI elements.
- **L1379 `.wallet-vanity-section`** — Styles matching UI elements.
- **L1383 `.wallet-vanity-row`** — Styles matching UI elements.
- **L1388 `.wallet-vanity-input`** — Styles matching UI elements.
- **L1400 `.wallet-vanity-input::placeholder`** — Styles matching UI elements.
- **L1403 `.vanity-btn`** — Styles matching UI elements.
- **L1410 `.wallet-profile-name, .wallet-profile-balance`** — Styles matching UI elements.
- **L1417 `#walletProfileName, #walletAddress`** — Styles matching UI elements.
- **L1421 `.wallet-profile-balance`** — Styles matching UI elements.
- **L1425 `.wallet-address`** — Styles matching UI elements.
- **L1432 `.wallet-tracking-status, .wallet-tracking-summary`** — Styles matching UI elements.
- **L1438 `.wallet-tracking-status`** — Styles matching UI elements.
- **L1441 `.wallet-tracking-status.good`** — Styles matching UI elements.
- **L1444 `.wallet-tracking-status.warn`** — Styles matching UI elements.
- **L1447 `.wallet-tracking-status.bad`** — Styles matching UI elements.
- **L1450 `.wallet-tracking-summary`** — Styles matching UI elements.
- **L1454 `.tracking-btn`** — Styles matching UI elements.
- **L1458 `.wallet-actions`** — Styles matching UI elements.
- **L1464 `.wallet-btn`** — Styles matching UI elements.
- **L1475 `.wallet-btn.secondary`** — Styles matching UI elements.
- **L1478 `.wallet-btn:disabled`** — Styles matching UI elements.
- **L1482 `.wallet-bankline`** — Styles matching UI elements.
- **L1488 `.wallet-note`** — Styles matching UI elements.
- **L1494 `.wallet-good`** — Styles matching UI elements.
- **L1495 `.wallet-warn`** — Styles matching UI elements.
- **L1496 `.wallet-bad`** — Styles matching UI elements.
- **L1499 `.intro-toggle`** — Styles matching UI elements.
- **L1512 `.intro-toggle:hover`** — Styles matching UI elements.
- **L1513 `.intro-toggle:focus-visible`** — Styles matching UI elements.
- **L1514 `.intro-toggle.secondary-guide`** — Styles matching UI elements.
- **L1519 `.intro-toggle.secondary-guide:hover`** — Styles matching UI elements.
- **L1521 `.intro-modal`** — Styles matching UI elements.
- **L1532 `.intro-modal-card`** — Styles matching UI elements.
- **L1544 `.intro-modal-header`** — Styles matching UI elements.
- **L1552 `.intro-kicker`** — Styles matching UI elements.
- **L1559 `#introTitle`** — Styles matching UI elements.
- **L1565 `.intro-close`** — Styles matching UI elements.
- **L1575 `.intro-body`** — Styles matching UI elements.
- **L1582 `.intro-page-heading`** — Styles matching UI elements.
- **L1587 `.intro-page-subheading`** — Styles matching UI elements.
- **L1594 `.intro-body p`** — Styles matching UI elements.
- **L1597 `.intro-body ul`** — Styles matching UI elements.
- **L1601 `.intro-body li`** — Styles matching UI elements.
- **L1604 `.intro-highlight`** — Styles matching UI elements.
- **L1609 `.intro-section-card`** — Styles matching UI elements.
- **L1616 `.intro-section-card:last-child`** — Styles matching UI elements.
- **L1619 `.intro-compact-list`** — Styles matching UI elements.
- **L1622 `.intro-compact-list li`** — Styles matching UI elements.
- **L1626 `.intro-modal-footer`** — Styles matching UI elements.
- **L1634 `.intro-page-label`** — Styles matching UI elements.
- **L1640 `.intro-modal-footer .small-action, .intro-modal-footer .secondary`** — Styles matching UI elements.
- **L1647 `.intro-modal-footer .secondary`** — Styles matching UI elements.
- **L1650 `.intro-modal-footer .small-action:disabled, .intro-modal-footer .secondary:disabled`** — Styles matching UI elements.
- **L1654 `/* Responsive breakpoints 360px : mobile 568px : small landscape 666px : large landscape 768px : tablet 1024px : large tablet / small laptop 1300px : full de...`** — Styles matching UI elements.
### Css Blocks

- **L1668 `@media (max-width: 1024px)`** — Styles matching UI elements.
### Css Selectors

- **L1669 `.intro-modal`** — Styles matching UI elements.
- **L1670 `.intro-modal-card`** — Styles matching UI elements.
- **L1674 `.intro-modal-footer`** — Styles matching UI elements.
- **L1677 `.intro-modal-footer .small-action, .intro-modal-footer .secondary`** — Styles matching UI elements.
- **L1685 `.mobile-side-menu-toggle`** — Styles matching UI elements.
- **L1688 `.mobile-hud, .mobile-menu-overlay, .mobile-menu-shell, .mobile-menu-card, .mobile-bottom-bar, .mobile-bar-toggle`** — Styles matching UI elements.
- **L1698 `.mobile-install-prompt`** — Styles matching UI elements.
- **L1714 `.mobile-install-prompt.hidden`** — Styles matching UI elements.
- **L1717 `.mobile-install-text`** — Styles matching UI elements.
- **L1722 `.mobile-install-actions`** — Styles matching UI elements.
- **L1727 `.mobile-install-btn, .mobile-install-dismiss`** — Styles matching UI elements.
- **L1736 `.mobile-install-btn`** — Styles matching UI elements.
- **L1740 `.mobile-install-dismiss`** — Styles matching UI elements.
- **L1746 `.mobile-hud.bar-collapsed .mobile-install-prompt`** — Styles matching UI elements.
- **L1750 `.mobile-menu-overlay`** — Styles matching UI elements.
- **L1758 `.mobile-menu-shell`** — Styles matching UI elements.
- **L1767 `.mobile-menu-card`** — Styles matching UI elements.
- **L1779 `.mobile-menu-title`** — Styles matching UI elements.
- **L1787 `.mobile-menu-actions`** — Styles matching UI elements.
- **L1793 `.mobile-menu-actions button, .mobile-hero-host .action-group button, .mobile-hire-host .card button, .mobile-bottom-btn`** — Styles matching UI elements.
- **L1800 `.mobile-menu-actions button, .mobile-bottom-btn`** — Styles matching UI elements.
- **L1810 `.mobile-bottom-bar`** — Styles matching UI elements.
- **L1822 `.mobile-bar-toggle`** — Styles matching UI elements.
- **L1840 `.mobile-bar-toggle-chevron`** — Styles matching UI elements.
- **L1846 `.mobile-bar-toggle-notice`** — Styles matching UI elements.
- **L1857 `.mobile-bar-toggle.has-notice .mobile-bar-toggle-notice`** — Styles matching UI elements.
- **L1861 `.mobile-bar-toggle-notice.hidden`** — Styles matching UI elements.
- **L1865 `.mobile-hud.bar-collapsed .mobile-bottom-bar`** — Styles matching UI elements.
- **L1871 `.mobile-hud.bar-collapsed .mobile-bar-toggle-chevron`** — Styles matching UI elements.
- **L1875 `.mobile-bottom-btn`** — Styles matching UI elements.
- **L1880 `.mobile-bottom-btn.active`** — Styles matching UI elements.
- **L1885 `.mobile-bottom-btn:disabled`** — Styles matching UI elements.
- **L1889 `.mobile-ability-btn`** — Styles matching UI elements.
- **L1893 `.mobile-hero-host`** — Styles matching UI elements.
- **L1898 `.mobile-hero-host .selected-info`** — Styles matching UI elements.
- **L1904 `.mobile-hero-host .selected-info::-webkit-scrollbar`** — Styles matching UI elements.
- **L1905 `.mobile-hero-host .selected-info:hover, .mobile-hero-host .selected-info:focus-within`** — Styles matching UI elements.
- **L1907 `.mobile-hero-host .selected-info:hover::-webkit-scrollbar, .mobile-hero-host .selected-info:focus-within::-webkit-scrollbar`** — Styles matching UI elements.
- **L1909 `.mobile-hero-host .selected-info:hover::-webkit-scrollbar-thumb, .mobile-hero-host .selected-info:focus-within::-webkit-scrollbar-thumb`** — Styles matching UI elements.
- **L1911 `.mobile-hero-host .action-group`** — Styles matching UI elements.
- **L1912 `.mobile-hero-host .abilities-panel`** — Styles matching UI elements.
- **L1914 `.mobile-hire-host .hire-list`** — Styles matching UI elements.
- **L1920 `.mobile-hire-host .card`** — Styles matching UI elements.
- **L1924 `.mobile-side-rail`** — Styles matching UI elements.
- **L1928 `.mobile-side-host > .panel-lite, .mobile-side-host > .wallet-panel, .mobile-side-host > .topbar`** — Styles matching UI elements.
### Css Blocks

- **L1934 `@media (max-width: 1024px)`** — Styles matching UI elements.
### Css Selectors

- **L1935 `#app`** — Styles matching UI elements.
- **L1939 `.main-layout`** — Styles matching UI elements.
- **L1944 `.left-panel, .right-panel, .bottom-panel`** — Styles matching UI elements.
- **L1950 `.center-panel`** — Styles matching UI elements.
- **L1964 `.grid`** — Styles matching UI elements.
- **L1974 `.status-overlay`** — Styles matching UI elements.
### Css Blocks

- **L1988 `@media (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L1989 `.grid`** — Styles matching UI elements.
- **L1994 `.mobile-hud`** — Styles matching UI elements.
- **L1998 `.mobile-side-rail`** — Styles matching UI elements.
- **L2009 `.mobile-side-rail > *`** — Styles matching UI elements.
- **L2013 `.mobile-left-rail`** — Styles matching UI elements.
- **L2019 `.mobile-left-rail.collapsed`** — Styles matching UI elements.
- **L2023 `.mobile-side-menu-toggle`** — Styles matching UI elements.
- **L2042 `.mobile-right-rail`** — Styles matching UI elements.
- **L2049 `.mobile-right-rail.collapsed`** — Styles matching UI elements.
- **L2053 `.mobile-right-menu-toggle`** — Styles matching UI elements.
- **L2072 `.mobile-left-rail .panel-lite, .mobile-left-rail .wallet-panel, .mobile-right-rail .topbar`** — Styles matching UI elements.
- **L2083 `.mobile-left-rail .wallet-panel-toggle, .mobile-left-rail #bankPanel .wallet-panel-toggle`** — Styles matching UI elements.
- **L2090 `.mobile-left-rail .wallet-panel-toggle .meta-title, .mobile-left-rail #bankPanel .wallet-panel-toggle .meta-title`** — Styles matching UI elements.
- **L2097 `.mobile-left-rail .wallet-panel-body, .mobile-left-rail #bankPanel .bank-panel-body`** — Styles matching UI elements.
- **L2106 `.mobile-left-rail .wallet-actions`** — Styles matching UI elements.
- **L2110 `.mobile-left-rail .wallet-btn`** — Styles matching UI elements.
- **L2116 `.mobile-left-rail .wallet-note, .mobile-left-rail .wallet-address, .mobile-left-rail .wallet-status, .mobile-left-rail .wallet-bankline, .mobile-left-rail .m...`** — Styles matching UI elements.
- **L2126 `.mobile-right-rail .mobile-stats-panel`** — Styles matching UI elements.
- **L2131 `.mobile-right-rail .wallet-panel-toggle`** — Styles matching UI elements.
- **L2137 `.mobile-right-rail .wallet-panel-toggle .meta-title`** — Styles matching UI elements.
- **L2143 `.mobile-right-rail .mobile-stats-body`** — Styles matching UI elements.
- **L2147 `.mobile-right-rail .topbar`** — Styles matching UI elements.
- **L2157 `.mobile-right-rail .topbar > div, .mobile-right-rail .topbar > div:nth-child(n+4)`** — Styles matching UI elements.
- **L2165 `.mobile-right-rail .topbar strong, .mobile-right-rail .topbar span`** — Styles matching UI elements.
- **L2171 `.mobile-hud.hidden`** — Styles matching UI elements.
- **L2173 `.mobile-menu-overlay:not(.hidden)`** — Styles matching UI elements.
- **L2177 `.mobile-menu-shell:not(.hidden)`** — Styles matching UI elements.
- **L2181 `.mobile-menu-card:not(.hidden)`** — Styles matching UI elements.
- **L2185 `.mobile-bar-toggle`** — Styles matching UI elements.
- **L2189 `.mobile-bottom-bar`** — Styles matching UI elements.
### Css Blocks

- **L2194 `@media (max-width: 666px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L2195 `.mobile-install-prompt`** — Styles matching UI elements.
- **L2200 `.center-panel`** — Styles matching UI elements.
- **L2205 `.mobile-side-rail`** — Styles matching UI elements.
- **L2210 `.mobile-left-rail`** — Styles matching UI elements.
- **L2214 `.mobile-right-rail`** — Styles matching UI elements.
- **L2218 `.mobile-bottom-bar`** — Styles matching UI elements.
- **L2224 `.mobile-bar-toggle`** — Styles matching UI elements.
- **L2228 `.mobile-bottom-btn`** — Styles matching UI elements.
- **L2233 `.mobile-menu-card`** — Styles matching UI elements.
### Css Blocks

- **L2240 `@media (max-width: 568px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L2241 `.mobile-install-text`** — Styles matching UI elements.
- **L2245 `.mobile-install-btn`** — Styles matching UI elements.
- **L2250 `.center-panel`** — Styles matching UI elements.
- **L2255 `.mobile-left-rail`** — Styles matching UI elements.
- **L2259 `.mobile-right-rail`** — Styles matching UI elements.
- **L2263 `.grid`** — Styles matching UI elements.
### Css Blocks

- **L2271 `@media (max-width: 360px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L2272 `.mobile-install-prompt`** — Styles matching UI elements.
- **L2278 `.mobile-install-text`** — Styles matching UI elements.
- **L2282 `.center-panel`** — Styles matching UI elements.
- **L2287 `.mobile-left-rail`** — Styles matching UI elements.
- **L2291 `.mobile-right-rail`** — Styles matching UI elements.
- **L2295 `.grid`** — Styles matching UI elements.
- **L2299 `.mobile-bottom-btn`** — Styles matching UI elements.
### Css Blocks

- **L2306 `@media (min-width: 1025px)`** — Styles matching UI elements.
### Css Selectors

- **L2307 `.center-panel`** — Styles matching UI elements.
- **L2312 `.grid`** — Styles matching UI elements.
- **L2316 `.status-overlay`** — Styles matching UI elements.
- **L2326 `/* === user-requested desktop layout alignment === */ @media (min-width: 1025px)`** — Styles matching UI elements.
- **L2328 `.center-panel`** — Styles matching UI elements.
- **L2336 `.status-overlay`** — Styles matching UI elements.
- **L2352 `.status-overlay.hidden`** — Styles matching UI elements.
- **L2357 `.grid`** — Styles matching UI elements.
- **L2361 `.bottom-panel`** — Styles matching UI elements.
- **L2374 `.controls-row.action-row`** — Styles matching UI elements.
- **L2380 `.footer-topbar`** — Styles matching UI elements.
- **L2385 `.controls-stack`** — Styles matching UI elements.
- **L2390 `.control-section.hire-section`** — Styles matching UI elements.
- **L2394 `.hire-section`** — Styles matching UI elements.
- **L2398 `.hire-list`** — Styles matching UI elements.
- **L2405 `.hire-list > *`** — Styles matching UI elements.
- **L2409 `.hire-list .card`** — Styles matching UI elements.
- **L2413 `.relic-section`** — Styles matching UI elements.
### Css Blocks

- **L2418 `@media (min-width: 1025px) and (max-width: 1200px)`** — Styles matching UI elements.
### Css Selectors

- **L2419 `.footer-topbar`** — Styles matching UI elements.
- **L2423 `.controls-row.action-row`** — Styles matching UI elements.
- **L2427 `.hire-list`** — Styles matching UI elements.
- **L2434 `/* Simplified hire panel: buttons only */ .hire-section`** — Styles matching UI elements.
- **L2439 `.hire-list`** — Styles matching UI elements.
- **L2445 `.hire-list .card, .hire-button-card`** — Styles matching UI elements.
- **L2454 `.hire-list .card h4, .hire-list .card p`** — Styles matching UI elements.
- **L2459 `.hire-list .card button`** — Styles matching UI elements.
- **L2463 `.control-section.hire-section`** — Styles matching UI elements.
- **L2467 `.bottom-panel .controls-stack`** — Styles matching UI elements.
- **L2472 `.tile`** — Styles matching UI elements.
- **L2476 `.tile-hero-portrait`** — Styles matching UI elements.
- **L2489 `.tile-hero-portrait-underlay`** — Styles matching UI elements.
- **L2495 `.tile-ethereal-hero`** — Styles matching UI elements.
- **L2504 `.tile-archer-shadow-hero`** — Styles matching UI elements.
- **L2507 `.tile-archer-shadow-label`** — Styles matching UI elements.
- **L2512 `.tile-ethereal-label`** — Styles matching UI elements.
- **L2523 `.tile-statue-hero`** — Styles matching UI elements.
- **L2527 `.tile-statue-label`** — Styles matching UI elements.
- **L2537 `.tile-archon-sparkle::before, .tile-archon-sparkle::after`** — Styles matching UI elements.
- **L2549 `.tile-archon-sparkle::before`** — Styles matching UI elements.
- **L2554 `.tile-archon-sparkle::after`** — Styles matching UI elements.
### Css Blocks

- **L2560 `@keyframes archonSparkle`** — Styles matching UI elements.
### Css Selectors

- **L2561 `0%, 100%`** — Styles matching UI elements.
- **L2562 `50%`** — Styles matching UI elements.
- **L2565 `.tower-chip, .tile-small, .hp-bar, .cooldown-bar, .tile-hover-card, .hit-text`** — Styles matching UI elements.
- **L2575 `.hp-bar, .cooldown-bar`** — Styles matching UI elements.
- **L2581 `.hp-bar`** — Styles matching UI elements.
- **L2586 `.cooldown-bar`** — Styles matching UI elements.
- **L2593 `/* Hero tile portrait/layout adjustments */ .tower-chip`** — Styles matching UI elements.
- **L2600 `.hp-bar, .cooldown-bar`** — Styles matching UI elements.
- **L2607 `.hp-bar`** — Styles matching UI elements.
- **L2611 `.cooldown-bar`** — Styles matching UI elements.
- **L2615 `.tile-hero-portrait`** — Styles matching UI elements.
- **L2620 `/* === Bar swap: health fully inside black area above activity === */ .hp-bar, .cooldown-bar`** — Styles matching UI elements.
- **L2629 `/* Health bar sits clearly inside black strip */ .hp-bar`** — Styles matching UI elements.
- **L2635 `/* Activity bar below it */ .cooldown-bar`** — Styles matching UI elements.
- **L2645 `/* Hero header text inside colored strip */ /* Level tucked directly under class text */ /* Left-aligned header text inside colored strip */ /* Level left-al...`** — Styles matching UI elements.
- **L2683 `/* Lv left aligned and lowered */ /* Level number only, larger */ .tile-small`** — Styles matching UI elements.
- **L2703 `.tile-small-right`** — Styles matching UI elements.
- **L2712 `.slow-totem-badge`** — Styles matching UI elements.
- **L2730 `/* Keep hero panel visible as viewport narrows */ @media (min-width: 901px) and (max-width: 1420px)`** — Styles matching UI elements.
- **L2732 `.main-layout`** — Styles matching UI elements.
- **L2739 `.left-panel, .center-panel, .right-panel`** — Styles matching UI elements.
- **L2745 `.right-panel`** — Styles matching UI elements.
- **L2753 `#selectedInfo, .action-group, #abilitiesPanel`** — Styles matching UI elements.
### Css Blocks

- **L2760 `@media (min-width: 901px) and (max-width: 1200px)`** — Styles matching UI elements.
### Css Selectors

- **L2761 `.main-layout`** — Styles matching UI elements.
- **L2766 `.right-panel`** — Styles matching UI elements.
- **L2772 `/* Run Log inline header toggle */ .runlog-header`** — Styles matching UI elements.
- **L2781 `.runlog-header h2`** — Styles matching UI elements.
- **L2785 `.runlog-inline-toggle`** — Styles matching UI elements.
- **L2802 `.runlog-inline-toggle:hover`** — Styles matching UI elements.
### Css Blocks

- **L2806 `@media (min-width: 901px)`** — Styles matching UI elements.
### Css Selectors

- **L2807 `:root`** — Styles matching UI elements.
- **L2813 `.main-layout`** — Styles matching UI elements.
- **L2820 `.runlog-inline-toggle`** — Styles matching UI elements.
- **L2824 `#runLogPanel, .center-panel, .right-panel`** — Styles matching UI elements.
- **L2830 `#runLogPanel`** — Styles matching UI elements.
- **L2835 `.center-panel`** — Styles matching UI elements.
- **L2839 `.right-panel`** — Styles matching UI elements.
- **L2847 `body.runlog-collapsed`** — Styles matching UI elements.
- **L2851 `body.runlog-collapsed #runLogPanel`** — Styles matching UI elements.
- **L2856 `body.runlog-collapsed #runLogPanel .log, body.runlog-collapsed #runLogPanel .speed-toggle, body.runlog-collapsed #runLogPanel .mobile-toggle, body.runlog-col...`** — Styles matching UI elements.
- **L2873 `body.runlog-collapsed #runLogPanel .runlog-header`** — Styles matching UI elements.
- **L2877 `body.runlog-collapsed #runLogPanel .runlog-header h2`** — Styles matching UI elements.
- **L2882 `/* Keep hero info visible before it drops */ @media (min-width: 901px) and (max-width: 1760px)`** — Styles matching UI elements.
- **L2884 `:root`** — Styles matching UI elements.
- **L2886 `.main-layout`** — Styles matching UI elements.
### Css Blocks

- **L2888 `@media (min-width: 901px) and (max-width: 1660px)`** — Styles matching UI elements.
### Css Selectors

- **L2889 `:root`** — Styles matching UI elements.
- **L2891 `.main-layout`** — Styles matching UI elements.
### Css Blocks

- **L2893 `@media (min-width: 901px) and (max-width: 1560px)`** — Styles matching UI elements.
### Css Selectors

- **L2894 `:root`** — Styles matching UI elements.
- **L2896 `.main-layout`** — Styles matching UI elements.
### Css Blocks

- **L2898 `@media (min-width: 901px) and (max-width: 1460px)`** — Styles matching UI elements.
### Css Selectors

- **L2899 `:root`** — Styles matching UI elements.
- **L2901 `.main-layout`** — Styles matching UI elements.
### Css Blocks

- **L2903 `@media (min-width: 901px) and (max-width: 1360px)`** — Styles matching UI elements.
### Css Selectors

- **L2904 `:root`** — Styles matching UI elements.
- **L2906 `.main-layout`** — Styles matching UI elements.
- **L2907 `.right-panel`** — Styles matching UI elements.
- **L2913 `/* Final desktop layout: right panel always outside board, run log collapses cleanly */ .runlog-header`** — Styles matching UI elements.
- **L2922 `.runlog-header h2`** — Styles matching UI elements.
- **L2926 `.runlog-inline-toggle`** — Styles matching UI elements.
- **L2943 `.runlog-inline-toggle:hover`** — Styles matching UI elements.
### Css Blocks

- **L2947 `@media (min-width: 901px)`** — Styles matching UI elements.
### Css Selectors

- **L2948 `:root`** — Styles matching UI elements.
- **L2954 `#app`** — Styles matching UI elements.
- **L2958 `.main-layout`** — Styles matching UI elements.
- **L2966 `.left-panel, .center-panel, .right-panel, #runLogPanel`** — Styles matching UI elements.
- **L2974 `.runlog-inline-toggle`** — Styles matching UI elements.
- **L2978 `#runLogPanel`** — Styles matching UI elements.
- **L2983 `.center-panel`** — Styles matching UI elements.
- **L2988 `.center-panel .grid-wrap, .center-panel #grid, .center-panel .enemy-layer`** — Styles matching UI elements.
- **L2995 `.right-panel`** — Styles matching UI elements.
- **L3009 `body.runlog-collapsed`** — Styles matching UI elements.
- **L3013 `body.runlog-collapsed .main-layout`** — Styles matching UI elements.
- **L3017 `body.runlog-collapsed #runLogPanel`** — Styles matching UI elements.
- **L3022 `body.runlog-collapsed #runLogPanel .log, body.runlog-collapsed #runLogPanel .speed-toggle, body.runlog-collapsed #runLogPanel .mobile-toggle, body.runlog-col...`** — Styles matching UI elements.
- **L3039 `body.runlog-collapsed #runLogPanel .runlog-header`** — Styles matching UI elements.
- **L3044 `body.runlog-collapsed #runLogPanel .runlog-header h2`** — Styles matching UI elements.
- **L3049 `/* Narrow desktop: shrink board tile size first before letting the right panel overlap */ @media (min-width: 901px) and (max-width: 1760px)`** — Styles matching UI elements.
- **L3051 `:root`** — Styles matching UI elements.
- **L3053 `.main-layout`** — Styles matching UI elements.
### Css Blocks

- **L3055 `@media (min-width: 901px) and (max-width: 1660px)`** — Styles matching UI elements.
### Css Selectors

- **L3056 `:root`** — Styles matching UI elements.
- **L3058 `.main-layout`** — Styles matching UI elements.
### Css Blocks

- **L3060 `@media (min-width: 901px) and (max-width: 1560px)`** — Styles matching UI elements.
### Css Selectors

- **L3061 `:root`** — Styles matching UI elements.
- **L3063 `.main-layout`** — Styles matching UI elements.
### Css Blocks

- **L3065 `@media (min-width: 901px) and (max-width: 1460px)`** — Styles matching UI elements.
### Css Selectors

- **L3066 `:root`** — Styles matching UI elements.
- **L3068 `.main-layout`** — Styles matching UI elements.
### Css Blocks

- **L3070 `@media (min-width: 901px) and (max-width: 1360px)`** — Styles matching UI elements.
### Css Selectors

- **L3071 `:root`** — Styles matching UI elements.
- **L3073 `.main-layout`** — Styles matching UI elements.
- **L3074 `.right-panel`** — Styles matching UI elements.
- **L3078 `/* === FINAL DESKTOP BOARD SAFETY LAYOUT OVERRIDES === */ .runlog-header`** — Styles matching UI elements.
- **L3086 `.runlog-header h2`** — Styles matching UI elements.
- **L3087 `.runlog-inline-toggle`** — Styles matching UI elements.
- **L3103 `.runlog-inline-toggle:hover`** — Styles matching UI elements.
### Css Blocks

- **L3105 `@media (min-width: 901px)`** — Styles matching UI elements.
### Css Selectors

- **L3106 `:root`** — Styles matching UI elements.
- **L3118 `#app`** — Styles matching UI elements.
- **L3125 `.main-layout`** — Styles matching UI elements.
- **L3135 `.left-panel, .center-panel, .right-panel, #runLogPanel`** — Styles matching UI elements.
- **L3143 `.runlog-inline-toggle`** — Styles matching UI elements.
- **L3147 `.center-panel`** — Styles matching UI elements.
- **L3154 `.right-panel`** — Styles matching UI elements.
- **L3168 `.grid, #grid`** — Styles matching UI elements.
- **L3175 `.center-panel .grid-wrap, .center-panel .grid, .center-panel #grid, .center-panel .enemy-layer`** — Styles matching UI elements.
- **L3183 `#runLogPanel`** — Styles matching UI elements.
- **L3187 `body.runlog-collapsed`** — Styles matching UI elements.
- **L3191 `body.runlog-collapsed #runLogPanel`** — Styles matching UI elements.
- **L3196 `body.runlog-collapsed #runLogPanel .log, body.runlog-collapsed #runLogPanel .speed-toggle, body.runlog-collapsed #runLogPanel .mobile-toggle, body.runlog-col...`** — Styles matching UI elements.
- **L3213 `body.runlog-collapsed #runLogPanel .runlog-header`** — Styles matching UI elements.
- **L3218 `body.runlog-collapsed #runLogPanel .runlog-header h2`** — Styles matching UI elements.
- **L3223 `/* Keep hero panel outside the board by shrinking board first */ @media (min-width: 901px) and (max-width: 1760px)`** — Styles matching UI elements.
- **L3225 `:root`** — Styles matching UI elements.
### Css Blocks

- **L3231 `@media (min-width: 901px) and (max-width: 1660px)`** — Styles matching UI elements.
### Css Selectors

- **L3232 `:root`** — Styles matching UI elements.
### Css Blocks

- **L3238 `@media (min-width: 901px) and (max-width: 1560px)`** — Styles matching UI elements.
### Css Selectors

- **L3239 `:root`** — Styles matching UI elements.
### Css Blocks

- **L3245 `@media (min-width: 901px) and (max-width: 1460px)`** — Styles matching UI elements.
### Css Selectors

- **L3246 `:root`** — Styles matching UI elements.
- **L3251 `.main-layout`** — Styles matching UI elements.
### Css Blocks

- **L3253 `@media (min-width: 901px) and (max-width: 1360px)`** — Styles matching UI elements.
### Css Selectors

- **L3254 `:root`** — Styles matching UI elements.
- **L3260 `.main-layout`** — Styles matching UI elements.
- **L3261 `.right-panel`** — Styles matching UI elements.
- **L3265 `/* ===== 2026 mobile-first layout reset ===== */ :root`** — Styles matching UI elements.
- **L3278 `#app`** — Styles matching UI elements.
- **L3283 `.main-layout`** — Styles matching UI elements.
- **L3287 `.center-panel`** — Styles matching UI elements.
- **L3295 `#banner`** — Styles matching UI elements.
- **L3309 `.grid`** — Styles matching UI elements.
- **L3316 `.bottom-panel`** — Styles matching UI elements.
- **L3323 `.controls-row.action-row, .controls-row.action-row.controls-row-lean`** — Styles matching UI elements.
- **L3331 `.footer-topbar, .footer-topbar.footer-topbar-separated`** — Styles matching UI elements.
- **L3342 `.footer-topbar > div, .footer-topbar .hud-pill`** — Styles matching UI elements.
- **L3354 `.footer-topbar .hud-pill-portal`** — Styles matching UI elements.
- **L3355 `.footer-topbar .hud-pill-gold, .footer-topbar .hud-pill-wave`** — Styles matching UI elements.
- **L3357 `.footer-topbar .hud-pill strong`** — Styles matching UI elements.
- **L3359 `.controls-stack`** — Styles matching UI elements.
- **L3366 `.start-wave-stack`** — Styles matching UI elements.
- **L3375 `#startWaveBonusIndicator`** — Styles matching UI elements.
- **L3387 `.hire-section, .relic-section`** — Styles matching UI elements.
- **L3388 `.relic-section`** — Styles matching UI elements.
- **L3389 `.hire-list`** — Styles matching UI elements.
- **L3395 `.hire-list > *`** — Styles matching UI elements.
- **L3397 `.left-panel, .right-panel`** — Styles matching UI elements.
- **L3401 `.left-panel`** — Styles matching UI elements.
- **L3402 `.log`** — Styles matching UI elements.
- **L3407 `.selected-info`** — Styles matching UI elements.
- **L3412 `.abilities-panel`** — Styles matching UI elements.
- **L3416 `.panel-toggle-row`** — Styles matching UI elements.
- **L3421 `.panel-toggle-btn`** — Styles matching UI elements.
- **L3426 `.status-overlay`** — Styles matching UI elements.
- **L3431 `/* Mobile-first flow */ @media (max-width: 1024px)`** — Styles matching UI elements.
- **L3433 `:root`** — Styles matching UI elements.
- **L3439 `html, body`** — Styles matching UI elements.
- **L3441 `#app`** — Styles matching UI elements.
- **L3446 `.left-panel, .right-panel, .bottom-panel`** — Styles matching UI elements.
- **L3452 `.center-panel`** — Styles matching UI elements.
- **L3457 `.grid`** — Styles matching UI elements.
- **L3461 `#mobileHud.hidden`** — Styles matching UI elements.
- **L3467 `.mobile-bottom-bar`** — Styles matching UI elements.
- **L3472 `/* Desktop flow */ @media (min-width: 1025px)`** — Styles matching UI elements.
- **L3474 `:root`** — Styles matching UI elements.
- **L3485 `html, body`** — Styles matching UI elements.
- **L3487 `#app`** — Styles matching UI elements.
- **L3491 `.main-layout`** — Styles matching UI elements.
- **L3498 `.left-panel, .right-panel`** — Styles matching UI elements.
- **L3508 `.center-panel`** — Styles matching UI elements.
- **L3516 `.grid`** — Styles matching UI elements.
- **L3520 `.bottom-panel`** — Styles matching UI elements.
- **L3525 `.log`** — Styles matching UI elements.
- **L3531 `body.runlog-collapsed`** — Styles matching UI elements.
- **L3534 `body.runlog-collapsed #runLogPanel`** — Styles matching UI elements.
- **L3539 `body.runlog-collapsed #runLogPanel > :not(#runLogHeader)`** — Styles matching UI elements.
- **L3543 `body.info-collapsed`** — Styles matching UI elements.
- **L3546 `body.info-collapsed #infoPanel`** — Styles matching UI elements.
- **L3550 `body.info-collapsed #infoPanel > :not(.panel-toggle-row)`** — Styles matching UI elements.
- **L3554 `body.info-collapsed #infoPanel .panel-toggle-row`** — Styles matching UI elements.
- **L3559 `#mobileHud`** — Styles matching UI elements.
- **L3565 `/* Mobile left flyout reset */ .mobile-flyout-stack, .mobile-flyout-tab, .mobile-flyout-menu`** — Styles matching UI elements.
### Css Blocks

- **L3572 `@media (max-width: 1024px)`** — Styles matching UI elements.
### Css Selectors

- **L3573 `#mobileFlyoutStack`** — Styles matching UI elements.
- **L3584 `#mobileFlyoutStack[aria-hidden="true"]`** — Styles matching UI elements.
- **L3588 `.mobile-flyout-tab`** — Styles matching UI elements.
- **L3605 `.mobile-flyout-label`** — Styles matching UI elements.
- **L3612 `.mobile-flyout-chevron`** — Styles matching UI elements.
- **L3619 `.mobile-flyout-tab.active`** — Styles matching UI elements.
- **L3624 `.mobile-flyout-tab.active .mobile-flyout-chevron`** — Styles matching UI elements.
- **L3628 `.mobile-flyout-tab.has-notice`** — Styles matching UI elements.
- **L3632 `.mobile-flyout-tab.has-notice::after`** — Styles matching UI elements.
- **L3644 `.mobile-menu-overlay`** — Styles matching UI elements.
- **L3648 `.mobile-menu-shell`** — Styles matching UI elements.
- **L3656 `.mobile-menu-card, .mobile-menu-card.hidden, .mobile-flyout-menu, .mobile-flyout-menu.hidden`** — Styles matching UI elements.
- **L3663 `.mobile-flyout-menu`** — Styles matching UI elements.
- **L3678 `.mobile-flyout-menu:not(.hidden)`** — Styles matching UI elements.
- **L3684 `.mobile-hero-host .selected-info`** — Styles matching UI elements.
- **L3689 `.mobile-hire-host .hire-list`** — Styles matching UI elements.
- **L3693 `.mobile-bar-toggle, .mobile-bottom-bar, .mobile-left-rail, .mobile-right-rail, .mobile-side-menu-toggle, .mobile-right-menu-toggle`** — Styles matching UI elements.
- **L3702 `.center-panel`** — Styles matching UI elements.
### Css Blocks

- **L3708 `@media (max-width: 666px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L3709 `#mobileFlyoutStack`** — Styles matching UI elements.
- **L3714 `.mobile-flyout-tab`** — Styles matching UI elements.
- **L3719 `.mobile-flyout-label`** — Styles matching UI elements.
- **L3722 `.mobile-flyout-menu`** — Styles matching UI elements.
- **L3729 `.center-panel`** — Styles matching UI elements.
- **L3734 `/* 2026 mobile landscape rebuild: iPhone 14 Pro first */ @media (max-width: 1024px) and (orientation: portrait)`** — Styles matching UI elements.
- **L3736 `#app`** — Styles matching UI elements.
- **L3737 `.mobile-rotate-prompt`** — Styles matching UI elements.
- **L3748 `.mobile-rotate-card`** — Styles matching UI elements.
- **L3755 `.mobile-rotate-icon`** — Styles matching UI elements.
- **L3762 `.mobile-rotate-title`** — Styles matching UI elements.
- **L3767 `.mobile-rotate-copy`** — Styles matching UI elements.
### Css Blocks

- **L3773 `@keyframes mobileRotatePromptBob`** — Styles matching UI elements.
### Css Selectors

- **L3774 `0%, 100%`** — Styles matching UI elements.
- **L3775 `20%`** — Styles matching UI elements.
- **L3776 `50%`** — Styles matching UI elements.
- **L3777 `80%`** — Styles matching UI elements.
### Css Blocks

- **L3780 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L3781 `.mobile-rotate-prompt`** — Styles matching UI elements.
- **L3783 `:root`** — Styles matching UI elements.
- **L3802 `html, body`** — Styles matching UI elements.
- **L3807 `body`** — Styles matching UI elements.
- **L3811 `#app`** — Styles matching UI elements.
- **L3815 `.main-layout`** — Styles matching UI elements.
- **L3823 `.left-panel, .right-panel`** — Styles matching UI elements.
- **L3828 `.center-panel`** — Styles matching UI elements.
- **L3838 `#banner`** — Styles matching UI elements.
- **L3853 `#grid.grid`** — Styles matching UI elements.
- **L3867 `.tile, .grid > .tile`** — Styles matching UI elements.
- **L3873 `.center-panel .enemy-layer, .center-panel .portal-art-layer, .center-panel .grid-wrap, .center-panel #grid`** — Styles matching UI elements.
- **L3881 `.bottom-panel`** — Styles matching UI elements.
- **L3894 `.bottom-panel .controls-row`** — Styles matching UI elements.
- **L3900 `.bottom-panel .lean-action, .bottom-panel .controls-stack, .bottom-panel .relic-section, .bottom-panel .hire-section, .bottom-panel #skipSetupBtn, .bottom-pa...`** — Styles matching UI elements.
- **L3910 `.footer-topbar`** — Styles matching UI elements.
- **L3920 `.footer-topbar .hud-pill`** — Styles matching UI elements.
- **L3929 `#mobileHud`** — Styles matching UI elements.
- **L3933 `#mobileFlyoutStack`** — Styles matching UI elements.
- **L3943 `.mobile-flyout-tab`** — Styles matching UI elements.
- **L3950 `.mobile-flyout-label`** — Styles matching UI elements.
- **L3954 `#mobileQuickRail`** — Styles matching UI elements.
- **L3964 `.mobile-quick-btn, .mobile-bottom-btn`** — Styles matching UI elements.
- **L3980 `.mobile-quick-start`** — Styles matching UI elements.
- **L3984 `.mobile-quick-status`** — Styles matching UI elements.
- **L3989 `.mobile-quick-btn:disabled, .mobile-bottom-btn:disabled`** — Styles matching UI elements.
- **L3994 `.mobile-quick-btn.is-live, .mobile-bottom-btn:not(:disabled)`** — Styles matching UI elements.
- **L3999 `#mobileBottomBar`** — Styles matching UI elements.
- **L4008 `.mobile-menu-overlay:not(.hidden)`** — Styles matching UI elements.
- **L4016 `.mobile-menu-shell`** — Styles matching UI elements.
- **L4023 `.mobile-flyout-menu`** — Styles matching UI elements.
- **L4037 `.mobile-flyout-menu:not(.hidden)`** — Styles matching UI elements.
- **L4043 `.mobile-menu-title`** — Styles matching UI elements.
- **L4049 `.mobile-menu-actions`** — Styles matching UI elements.
- **L4054 `.mobile-menu-actions button, .mobile-hero-host .action-group button, .mobile-hire-host .hire-card button, .mobile-hire-host .card button`** — Styles matching UI elements.
- **L4061 `.mobile-hero-host`** — Styles matching UI elements.
- **L4066 `.mobile-hero-host .selected-info`** — Styles matching UI elements.
- **L4073 `.mobile-hero-host .action-group`** — Styles matching UI elements.
- **L4079 `.mobile-hire-host .hire-list, .mobile-hire-host .card-list`** — Styles matching UI elements.
- **L4086 `.status-overlay`** — Styles matching UI elements.
- **L4100 `.status-overlay.hidden`** — Styles matching UI elements.
- **L4104 `.mobile-left-rail, .mobile-right-rail, .mobile-side-menu-toggle, .mobile-right-menu-toggle, .mobile-bar-toggle, .mobile-install-prompt, #runLogPanel, #infoPanel`** — Styles matching UI elements.
- **L4117 `/* iPhone 14 Pro Max landscape tune: keep full board visible and restore full-width ability dock */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L4119 `:root`** — Styles matching UI elements.
- **L4140 `.center-panel`** — Styles matching UI elements.
- **L4148 `#grid.grid`** — Styles matching UI elements.
- **L4153 `.footer-topbar, #banner`** — Styles matching UI elements.
- **L4159 `#mobileQuickRail`** — Styles matching UI elements.
- **L4163 `#mobileBottomBar`** — Styles matching UI elements.
- **L4179 `.mobile-bottom-btn, .mobile-ability-btn`** — Styles matching UI elements.
- **L4199 `.mobile-bottom-btn.has-art::before, .mobile-ability-btn.has-art::before`** — Styles matching UI elements.
- **L4215 `.mobile-bottom-btn.has-art::after, .mobile-ability-btn.has-art::after`** — Styles matching UI elements.
- **L4225 `.mobile-ability-btn .ability-name`** — Styles matching UI elements.
- **L4235 `.mobile-ability-btn .ability-meta`** — Styles matching UI elements.
- **L4246 `.mobile-bottom-btn:disabled .ability-meta`** — Styles matching UI elements.
- **L4250 `.status-overlay`** — Styles matching UI elements.
- **L4260 `/* Final mobile landscape board-fit correction: force full 14x6 board on screen */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L4262 `:root`** — Styles matching UI elements.
- **L4285 `html, body, #app, .main-layout`** — Styles matching UI elements.
- **L4291 `#app`** — Styles matching UI elements.
- **L4296 `.main-layout`** — Styles matching UI elements.
- **L4300 `.center-panel`** — Styles matching UI elements.
- **L4314 `#grid.grid, .grid`** — Styles matching UI elements.
- **L4330 `.tile, .grid > .tile`** — Styles matching UI elements.
- **L4336 `#mobileBottomBar`** — Styles matching UI elements.
- **L4349 `.status-overlay`** — Styles matching UI elements.
- **L4362 `.status-overlay .phase-label, .status-overlay .instruction`** — Styles matching UI elements.
- **L4367 `.status-overlay .instruction`** — Styles matching UI elements.
### Css Blocks

- **L4375 `@media (max-width: 900px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L4376 `:root`** — Styles matching UI elements.
- **L4391 `.footer-topbar`** — Styles matching UI elements.
- **L4396 `.footer-topbar .hud-pill`** — Styles matching UI elements.
- **L4402 `#mobilePortalHp, #mobileGoldCount`** — Styles matching UI elements.
- **L4409 `#mobileFlyoutStack`** — Styles matching UI elements.
- **L4413 `.mobile-flyout-tab`** — Styles matching UI elements.
- **L4424 `.mobile-flyout-label`** — Styles matching UI elements.
- **L4432 `#mobileQuickRail`** — Styles matching UI elements.
- **L4437 `.mobile-quick-btn`** — Styles matching UI elements.
- **L4446 `.mobile-quick-start`** — Styles matching UI elements.
- **L4450 `.mobile-quick-status`** — Styles matching UI elements.
- **L4454 `#mobileBottomBar`** — Styles matching UI elements.
- **L4459 `.mobile-bottom-btn, .mobile-ability-btn`** — Styles matching UI elements.
- **L4466 `.mobile-ability-btn .ability-name`** — Styles matching UI elements.
- **L4470 `.mobile-ability-btn .ability-meta`** — Styles matching UI elements.
- **L4474 `.hero-quick-btn.has-ready-ability::after`** — Styles matching UI elements.
- **L4482 `body.intro-open .mobile-side-rail, body.intro-open .mobile-bottom-bar, body.intro-open .mobile-bar-toggle, body.intro-open .mobile-quick-rail, body.intro-ope...`** — Styles matching UI elements.
### Css Blocks

- **L4493 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L4494 `.intro-modal`** — Styles matching UI elements.
- **L4500 `.intro-modal-card`** — Styles matching UI elements.
- **L4510 `/* v8: runtime-sized mobile board fit for iPhone 14 Pro Max landscape */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L4512 `:root`** — Styles matching UI elements.
- **L4532 `.center-panel`** — Styles matching UI elements.
- **L4542 `#grid.grid, .grid`** — Styles matching UI elements.
- **L4559 `.tile, .grid > .tile`** — Styles matching UI elements.
- **L4565 `#mobileBottomBar`** — Styles matching UI elements.
- **L4571 `.status-overlay`** — Styles matching UI elements.
- **L4579 `body.intro-open .intro-modal, body.intro-open .intro-modal-card`** — Styles matching UI elements.
- **L4586 `/* v10: final mobile landscape fit + overlay message cleanup */ .tile, .grid > .tile`** — Styles matching UI elements.
### Css Blocks

- **L4592 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L4593 `.center-panel`** — Styles matching UI elements.
- **L4597 `#grid.grid, .grid`** — Styles matching UI elements.
- **L4606 `.status-overlay`** — Styles matching UI elements.
- **L4623 `.status-overlay .phase-label, .status-overlay .instruction`** — Styles matching UI elements.
- **L4629 `.status-overlay .phase-label`** — Styles matching UI elements.
- **L4633 `.status-overlay .instruction`** — Styles matching UI elements.
- **L4640 `/* v11: final mobile message overlay + edge-safe board fit */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L4642 `.center-panel`** — Styles matching UI elements.
- **L4647 `.status-overlay`** — Styles matching UI elements.
- **L4668 `.status-overlay .phase-label, .status-overlay .instruction`** — Styles matching UI elements.
- **L4673 `#grid.grid, .grid`** — Styles matching UI elements.
- **L4679 `/* v12 overlay fix */ .status-message, .status-overlay`** — Styles matching UI elements.
- **L4683 `/* v13: mobile transient banner as true overlay; no board reservation */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L4685 `#banner.banner`** — Styles matching UI elements.
- **L4712 `.center-panel`** — Styles matching UI elements.
- **L4716 `#grid.grid, .grid`** — Styles matching UI elements.
- **L4722 `/* v14 ability bar spacing + size */ .ability-bar, .abilities, .bottom-bar`** — Styles matching UI elements.
- **L4727 `.ability-bar button, .abilities button, .bottom-bar button`** — Styles matching UI elements.
- **L4732 `.ability-bar, .abilities, .bottom-bar`** — Styles matching UI elements.
- **L4736 `/* v14 message wrapping */ .status-message, .status-overlay`** — Styles matching UI elements.
- **L4746 `/* v15 precise mobile bottom bar + message fixes */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L4748 `#mobileBottomBar.mobile-bottom-bar`** — Styles matching UI elements.
- **L4763 `#mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn`** — Styles matching UI elements.
- **L4772 `#mobileBottomBar .mobile-bottom-btn small, #mobileBottomBar .mobile-ability-btn small, #mobileBottomBar .mobile-btn-sub, #mobileBottomBar .mobile-btn-meta`** — Styles matching UI elements.
- **L4779 `#statusOverlay.status-overlay`** — Styles matching UI elements.
- **L4800 `#statusOverlay.hidden, #statusOverlay.status-overlay.hidden`** — Styles matching UI elements.
- **L4809 `body.intro-open #statusOverlay, body.intro-open #statusOverlay.status-overlay, body.intro-open .center-panel #statusOverlay, body.intro-open .center-panel #s...`** — Styles matching UI elements.
- **L4819 `#statusOverlay .phase-label`** — Styles matching UI elements.
- **L4825 `#statusOverlay .instruction`** — Styles matching UI elements.
- **L4837 `/* v17 force fully opaque mobile status overlay */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L4839 `#statusOverlay, #statusOverlay.status-overlay, .status-overlay, .status-message, #banner, .banner`** — Styles matching UI elements.
- **L4852 `#statusOverlay::before, #statusOverlay::after, .status-overlay::before, .status-overlay::after, .status-message::before, .status-message::after, #banner::bef...`** — Styles matching UI elements.
- **L4869 `/* v18: truly solid mobile status overlay */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L4871 `#statusOverlay, #statusOverlay.status-overlay`** — Styles matching UI elements.
- **L4898 `#statusOverlay::before`** — Styles matching UI elements.
- **L4908 `#statusOverlay .phase-label, #statusOverlay .instruction`** — Styles matching UI elements.
- **L4919 `/* v19: desktop board fill tune — expand board and keep right hero/hire info column visually matched */ @media (min-width: 1025px)`** — Styles matching UI elements.
- **L4921 `:root`** — Styles matching UI elements.
- **L4931 `.main-layout`** — Styles matching UI elements.
- **L4936 `.center-panel`** — Styles matching UI elements.
- **L4940 `.grid, #grid`** — Styles matching UI elements.
- **L4945 `.bottom-panel`** — Styles matching UI elements.
- **L4950 `.right-panel`** — Styles matching UI elements.
- **L4954 `.selected-info, .abilities-panel`** — Styles matching UI elements.
- **L4961 `/* v20 balance + mobile quick status */ .mobile-quick-status`** — Styles matching UI elements.
### Css Blocks

- **L4966 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L4967 `.mobile-quick-status`** — Styles matching UI elements.
- **L4978 `.mobile-quick-stat`** — Styles matching UI elements.
- **L4984 `.mobile-quick-stat-label`** — Styles matching UI elements.
- **L4993 `.mobile-quick-stat-value`** — Styles matching UI elements.
- **L5003 `/* v24.2: desktop bottom HUD split into two clean rows; keep mobile unchanged */ @media (min-width: 1025px)`** — Styles matching UI elements.
- **L5005 `.bottom-panel .controls-row.action-row, .bottom-panel .controls-row.action-row.controls-row-lean`** — Styles matching UI elements.
- **L5013 `.bottom-panel .start-wave-stack`** — Styles matching UI elements.
- **L5017 `.bottom-panel .footer-topbar, .bottom-panel .footer-topbar.footer-topbar-separated`** — Styles matching UI elements.
- **L5022 `.bottom-panel .footer-topbar .hud-pill`** — Styles matching UI elements.
- **L5028 `.bottom-panel .controls-stack`** — Styles matching UI elements.
- **L5032 `.bottom-panel .hire-section`** — Styles matching UI elements.
- **L5036 `.bottom-panel .hire-list`** — Styles matching UI elements.
- **L5042 `.bottom-panel .hire-list .card, .bottom-panel .hire-button-card`** — Styles matching UI elements.
- **L5047 `.bottom-panel .hire-list .card button, .bottom-panel .hire-button-card button`** — Styles matching UI elements.
- **L5056 `.bottom-panel .hire-list > :nth-child(1)`** — Styles matching UI elements.
- **L5057 `.bottom-panel .hire-list > :nth-child(2)`** — Styles matching UI elements.
- **L5058 `.bottom-panel .hire-list > :nth-child(3)`** — Styles matching UI elements.
- **L5059 `.bottom-panel .hire-list > :nth-child(4)`** — Styles matching UI elements.
- **L5060 `.bottom-panel .hire-list > :nth-child(5)`** — Styles matching UI elements.
- **L5064 `/* v24.5: desktop status/info message floats near bottom center and lasts 2.5s */ @media (min-width: 1025px)`** — Styles matching UI elements.
- **L5066 `#statusOverlay, #statusOverlay.status-overlay, .status-overlay`** — Styles matching UI elements.
- **L5083 `/* v24.8: challenge mode visible but unavailable */ .coming-soon-toggle, #mobileFuncChallengeBtn:disabled`** — Styles matching UI elements.
- **L5090 `.coming-soon-toggle:hover, .coming-soon-toggle:focus-visible, #mobileFuncChallengeBtn:disabled:hover, #mobileFuncChallengeBtn:disabled:focus-visible`** — Styles matching UI elements.
- **L5099 `.coming-soon-toggle, .coming-soon-toggle.active`** — Styles matching UI elements.
- **L5107 `/* Preparation Phase banner fix */ .preparation-phase, .prep-phase, .phase-banner`** — Styles matching UI elements.
- **L5120 `.preparation-phase span, .prep-phase span, .phase-banner span`** — Styles matching UI elements.
- **L5127 `.passive-card p strong`** — Styles matching UI elements.
- **L5133 `.wallet-auth`** — Styles matching UI elements.
- **L5140 `.auth-fields`** — Styles matching UI elements.
- **L5145 `.auth-input`** — Styles matching UI elements.
- **L5155 `.auth-input::placeholder`** — Styles matching UI elements.
- **L5158 `.auth-actions`** — Styles matching UI elements.
- **L5161 `.auth-actions-single`** — Styles matching UI elements.
- **L5164 `.auth-player-stats`** — Styles matching UI elements.
- **L5170 `.auth-board-wrap`** — Styles matching UI elements.
- **L5175 `.auth-board-title`** — Styles matching UI elements.
- **L5182 `.auth-board-empty, .auth-board-list`** — Styles matching UI elements.
- **L5189 `.auth-board-list`** — Styles matching UI elements.
- **L5193 `.auth-board-row`** — Styles matching UI elements.
- **L5199 `.auth-board-rank`** — Styles matching UI elements.
- **L5203 `.auth-board-user`** — Styles matching UI elements.
- **L5209 `.auth-board-score`** — Styles matching UI elements.
- **L5214 `/* V40 leaderboard flyout */ .leaderboard-flyout-btn`** — Styles matching UI elements.
- **L5229 `.leaderboard-flyout-btn:hover`** — Styles matching UI elements.
- **L5234 `.leaderboard-flyout-btn:focus-visible`** — Styles matching UI elements.
- **L5239 `.leaderboard-backdrop`** — Styles matching UI elements.
- **L5246 `.leaderboard-backdrop.hidden`** — Styles matching UI elements.
- **L5250 `.leaderboard-flyout`** — Styles matching UI elements.
- **L5272 `.leaderboard-flyout.open`** — Styles matching UI elements.
- **L5276 `.leaderboard-flyout-header`** — Styles matching UI elements.
- **L5284 `.leaderboard-kicker`** — Styles matching UI elements.
- **L5291 `.leaderboard-title`** — Styles matching UI elements.
- **L5297 `.leaderboard-close, .leaderboard-sort-btn, .leaderboard-refresh-btn`** — Styles matching UI elements.
- **L5306 `.leaderboard-close`** — Styles matching UI elements.
- **L5313 `.leaderboard-controls`** — Styles matching UI elements.
- **L5320 `.leaderboard-sort-btn, .leaderboard-refresh-btn`** — Styles matching UI elements.
- **L5327 `.leaderboard-sort-btn.active`** — Styles matching UI elements.
- **L5332 `.leaderboard-status`** — Styles matching UI elements.
- **L5339 `.leaderboard-status:empty`** — Styles matching UI elements.
- **L5343 `.leaderboard-status.error`** — Styles matching UI elements.
- **L5347 `.leaderboard-table-wrap`** — Styles matching UI elements.
- **L5360 `.leaderboard-table`** — Styles matching UI elements.
- **L5367 `.leaderboard-table-wrap::-webkit-scrollbar`** — Styles matching UI elements.
- **L5371 `.leaderboard-table th, .leaderboard-table td`** — Styles matching UI elements.
- **L5380 `.leaderboard-table thead th`** — Styles matching UI elements.
- **L5393 `.leaderboard-table tbody tr:nth-child(odd)`** — Styles matching UI elements.
- **L5397 `.leaderboard-table tbody tr:hover`** — Styles matching UI elements.
- **L5401 `.leaderboard-rank`** — Styles matching UI elements.
- **L5408 `.leaderboard-name-cell`** — Styles matching UI elements.
- **L5413 `.leaderboard-empty`** — Styles matching UI elements.
- **L5418 `.leaderboard-wallet-cell`** — Styles matching UI elements.
- **L5423 `.leaderboard-wave-cell, .leaderboard-runs-cell, .leaderboard-burn-cell`** — Styles matching UI elements.
- **L5431 `.leaderboard-lurker`** — Styles matching UI elements.
- **L5443 `body.leaderboard-open`** — Styles matching UI elements.
### Css Blocks

- **L5447 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L5448 `.leaderboard-flyout-btn`** — Styles matching UI elements.
- **L5455 `.leaderboard-flyout`** — Styles matching UI elements.
- **L5461 `.leaderboard-flyout.leaderboard-flyout-wide, .leaderboard-flyout.leaderboard-flyout-daily`** — Styles matching UI elements.
- **L5466 `.leaderboard-table th:nth-child(1), .leaderboard-table td:nth-child(1)`** — Styles matching UI elements.
- **L5471 `.leaderboard-table th:nth-child(2), .leaderboard-table td:nth-child(2)`** — Styles matching UI elements.
- **L5476 `.leaderboard-table th:nth-child(3), .leaderboard-table td:nth-child(3)`** — Styles matching UI elements.
- **L5481 `.leaderboard-table th:nth-child(4), .leaderboard-table td:nth-child(4), .leaderboard-table th:nth-child(5), .leaderboard-table td:nth-child(5)`** — Styles matching UI elements.
- **L5488 `.leaderboard-table th:nth-child(6), .leaderboard-table td:nth-child(6)`** — Styles matching UI elements.
- **L5493 `.leaderboard-name-cell, .leaderboard-wallet-cell`** — Styles matching UI elements.
- **L5501 `.leaderboard-table th:nth-child(4), .leaderboard-table th:nth-child(5), .leaderboard-table th:nth-child(6), .leaderboard-table td:nth-child(4), .leaderboard-...`** — Styles matching UI elements.
- **L5510 `.leaderboard-table th:nth-child(3), .leaderboard-table td:nth-child(3)`** — Styles matching UI elements.
### Css Blocks

- **L5515 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L5516 `.leaderboard-flyout`** — Styles matching UI elements.
- **L5520 `.leaderboard-flyout.leaderboard-flyout-wide, .leaderboard-flyout.leaderboard-flyout-daily`** — Styles matching UI elements.
- **L5527 `.statue-hp-bar`** — Styles matching UI elements.
- **L5537 `/* V45.6 bounty board */ .bounty-toggle`** — Styles matching UI elements.
- **L5542 `.bounty-modal-card`** — Styles matching UI elements.
- **L5546 `.bounty-body`** — Styles matching UI elements.
- **L5551 `.bounty-hero-strip`** — Styles matching UI elements.
- **L5563 `.bounty-strip-kicker`** — Styles matching UI elements.
- **L5572 `.bounty-strip-copy`** — Styles matching UI elements.
- **L5578 `.bounty-strip-badge`** — Styles matching UI elements.
- **L5589 `.bounty-grid`** — Styles matching UI elements.
- **L5595 `.bounty-card`** — Styles matching UI elements.
- **L5606 `.bounty-card::after`** — Styles matching UI elements.
- **L5617 `.bounty-card.is-open`** — Styles matching UI elements.
- **L5622 `.bounty-card-top, .bounty-card-footer`** — Styles matching UI elements.
- **L5630 `.bounty-tier-wrap`** — Styles matching UI elements.
- **L5636 `.bounty-tier-label`** — Styles matching UI elements.
- **L5644 `.bounty-tier-index`** — Styles matching UI elements.
- **L5657 `.bounty-reward-pill, .bounty-state-chip`** — Styles matching UI elements.
- **L5669 `.bounty-reward-pill.is-open, .bounty-state-chip.is-open`** — Styles matching UI elements.
- **L5676 `.bounty-reward-pill.is-locked, .bounty-state-chip.is-locked`** — Styles matching UI elements.
- **L5683 `.bounty-card-title`** — Styles matching UI elements.
- **L5690 `.bounty-card-copy`** — Styles matching UI elements.
- **L5696 `.bounty-chain-note`** — Styles matching UI elements.
- **L5704 `.bounty-card.is-claimed`** — Styles matching UI elements.
- **L5709 `.bounty-reward-pill.is-claimed, .bounty-state-chip.is-claimed`** — Styles matching UI elements.
- **L5716 `.bounty-claimant`** — Styles matching UI elements.
- **L5722 `.bounty-claim-btn`** — Styles matching UI elements.
- **L5736 `.bounty-claim-btn:disabled`** — Styles matching UI elements.
- **L5741 `.bounty-claim-btn.is-submitting`** — Styles matching UI elements.
- **L5747 `.bounty-claim-btn-inner`** — Styles matching UI elements.
- **L5754 `.bounty-claim-spinner`** — Styles matching UI elements.
### Css Blocks

- **L5763 `@keyframes bounty-claim-spin`** — Styles matching UI elements.
### Css Selectors

- **L5768 `.bounty-status-banner`** — Styles matching UI elements.
- **L5776 `.bounty-status-banner.is-error`** — Styles matching UI elements.
### Css Blocks

- **L5782 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L5783 `.bounty-grid`** — Styles matching UI elements.
- **L5786 `.bounty-hero-strip`** — Styles matching UI elements.
### Css Blocks

- **L5792 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L5793 `.bounty-modal-card`** — Styles matching UI elements.
- **L5799 `/* V46.3 elite waves + relic codex */ .known-relics-toggle`** — Styles matching UI elements.
- **L5801 `.known-relics-modal-card .intro-modal-header`** — Styles matching UI elements.
- **L5802 `.known-relics-modal-card .intro-kicker`** — Styles matching UI elements.
- **L5803 `.known-relics-modal-card #knownRelicsTitle`** — Styles matching UI elements.
- **L5804 `.known-relics-modal-card .intro-close`** — Styles matching UI elements.
- **L5805 `.known-relics-modal-card .intro-body`** — Styles matching UI elements.
- **L5806 `.known-relics-modal-card`** — Styles matching UI elements.
- **L5807 `.known-relics-body`** — Styles matching UI elements.
- **L5808 `.known-relic-section`** — Styles matching UI elements.
- **L5809 `.known-relic-heading`** — Styles matching UI elements.
- **L5810 `.known-relic-heading-found`** — Styles matching UI elements.
- **L5811 `.known-relic-found-list`** — Styles matching UI elements.
- **L5812 `.known-relic-found-empty`** — Styles matching UI elements.
- **L5813 `.known-relic-card`** — Styles matching UI elements.
- **L5814 `.known-relic-card h4`** — Styles matching UI elements.
- **L5815 `.known-relic-card p`** — Styles matching UI elements.
- **L5816 `.relic-choice-card`** — Styles matching UI elements.
- **L5817 `.relic-choice-rarity`** — Styles matching UI elements.
- **L5818 `.relic-rarity-common`** — Styles matching UI elements.
- **L5819 `.relic-rarity-rare`** — Styles matching UI elements.
- **L5820 `.relic-rarity-legendary`** — Styles matching UI elements.
- **L5821 `.relic-rarity-mythic`** — Styles matching UI elements.
- **L5822 `.relic-choice-card.relic-rarity-common, .known-relic-card.relic-rarity-common, .relic-pill.relic-rarity-common`** — Styles matching UI elements.
- **L5823 `.relic-choice-card.relic-rarity-rare, .known-relic-card.relic-rarity-rare, .relic-pill.relic-rarity-rare`** — Styles matching UI elements.
- **L5824 `.relic-choice-card.relic-rarity-legendary, .known-relic-card.relic-rarity-legendary, .relic-pill.relic-rarity-legendary`** — Styles matching UI elements.
- **L5825 `.relic-choice-card.relic-rarity-mythic, .known-relic-card.relic-rarity-mythic, .relic-pill.relic-rarity-mythic`** — Styles matching UI elements.
- **L5826 `.relic-hidden-card`** — Styles matching UI elements.
- **L5827 `.elite-wave-modal-card`** — Styles matching UI elements.
- **L5828 `.elite-wave-body`** — Styles matching UI elements.
- **L5829 `.elite-wave-kicker`** — Styles matching UI elements.
- **L5830 `.elite-wave-title`** — Styles matching UI elements.
- **L5831 `.elite-wave-copy`** — Styles matching UI elements.
- **L5832 `.elite-wave-summary`** — Styles matching UI elements.
- **L5833 `body.elite-wave-shake .elite-wave-modal-card`** — Styles matching UI elements.
### Css Blocks

- **L5834 `@keyframes eliteWaveShake`** — Styles matching UI elements.
### Css Selectors

- **L5837 `.tracked-runs-toggle`** — Styles matching UI elements.
- **L5841 `.tracked-runs-modal-card`** — Styles matching UI elements.
- **L5845 `.tracked-runs-body`** — Styles matching UI elements.
- **L5851 `.tracked-runs-hero-strip`** — Styles matching UI elements.
- **L5862 `.tracked-runs-grid`** — Styles matching UI elements.
- **L5867 `.tracked-runs-note`** — Styles matching UI elements.
- **L5873 `.tracked-runs-search-wrap`** — Styles matching UI elements.
- **L5879 `.tracked-runs-controls`** — Styles matching UI elements.
- **L5886 `.tracked-runs-sort-wrap`** — Styles matching UI elements.
- **L5892 `.tracked-runs-search-label`** — Styles matching UI elements.
- **L5900 `.tracked-runs-search-input`** — Styles matching UI elements.
- **L5911 `.tracked-runs-search-input::placeholder`** — Styles matching UI elements.
- **L5915 `.tracked-runs-search-input:focus-visible`** — Styles matching UI elements.
- **L5921 `.tracked-runs-sort-select`** — Styles matching UI elements.
- **L5932 `.tracked-runs-sort-select:focus-visible`** — Styles matching UI elements.
- **L5938 `.tracked-run-card`** — Styles matching UI elements.
- **L5948 `.tracked-run-card.is-used`** — Styles matching UI elements.
- **L5954 `.tracked-run-card-top`** — Styles matching UI elements.
- **L5961 `.tracked-run-label`** — Styles matching UI elements.
- **L5968 `.tracked-run-id`** — Styles matching UI elements.
- **L5974 `.tracked-run-wave`** — Styles matching UI elements.
- **L5981 `.tracked-run-meta-row`** — Styles matching UI elements.
- **L5989 `.tracked-run-meta-pill`** — Styles matching UI elements.
- **L6002 `.tracked-run-meta-time`** — Styles matching UI elements.
- **L6007 `.tracked-run-status`** — Styles matching UI elements.
- **L6018 `.tracked-run-status.is-used`** — Styles matching UI elements.
- **L6023 `.tracked-run-status.is-available`** — Styles matching UI elements.
### Css Blocks

- **L6028 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L6029 `.tracked-runs-hero-strip`** — Styles matching UI elements.
- **L6033 `.tracked-runs-modal-card`** — Styles matching UI elements.
- **L6039 `.quests-toggle`** — Styles matching UI elements.
- **L6040 `.quests-modal-card`** — Styles matching UI elements.
- **L6041 `.quests-body`** — Styles matching UI elements.
- **L6042 `.quest-progress-row`** — Styles matching UI elements.
- **L6043 `.quest-progress-track`** — Styles matching UI elements.
- **L6044 `.quest-progress-track span`** — Styles matching UI elements.
- **L6045 `.quest-progress-text`** — Styles matching UI elements.
- **L6046 `.quest-card`** — Styles matching UI elements.
- **L6047 `.quests-summary-strip`** — Styles matching UI elements.
### Css Blocks

- **L6048 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L6051 `.desktop-only-inline`** — Styles matching UI elements.
### Css Blocks

- **L6052 `@media (max-width: 900px)`** — Styles matching UI elements.
- **L6054 `@media (min-width: 1025px)`** — Styles matching UI elements.
### Css Selectors

- **L6055 `#infoPanel`** — Styles matching UI elements.
- **L6056 `#infoPanel .panel-toggle-btn, #infoPanel .action-group button, #infoPanel .abilities-panel button`** — Styles matching UI elements.
- **L6062 `#infoPanel .selected-info`** — Styles matching UI elements.
- **L6070 `/* v46.9.1.60: keep the selected info box height fixed, but give the desktop info panel 50% more vertical room so all action buttons stay visible */ @media (...`** — Styles matching UI elements.
- **L6072 `:root`** — Styles matching UI elements.
- **L6077 `.right-panel`** — Styles matching UI elements.
- **L6083 `.selected-info`** — Styles matching UI elements.
- **L6089 `.version-badge`** — Styles matching UI elements.
### Css Blocks

- **L6105 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L6106 `.version-badge`** — Styles matching UI elements.
- **L6114 `/* v46.9.1.27 desktop width restore + announcement modal */ @media (min-width: 1025px)`** — Styles matching UI elements.
- **L6116 `:root`** — Styles matching UI elements.
- **L6121 `.main-layout`** — Styles matching UI elements.
- **L6126 `.intro-body p:last-child`** — Styles matching UI elements.
- **L6128 `.story-overlay`** — Styles matching UI elements.
- **L6137 `.story-overlay.hidden`** — Styles matching UI elements.
- **L6139 `.story-text`** — Styles matching UI elements.
- **L6159 `.story-text.visible`** — Styles matching UI elements.
- **L6164 `.story-text.fiery-final`** — Styles matching UI elements.
- **L6171 `.story-final-title-wrap`** — Styles matching UI elements.
- **L6181 `.story-final-title`** — Styles matching UI elements.
- **L6198 `.story-final-title::before, .story-final-title::after`** — Styles matching UI elements.
- **L6208 `.story-final-title::before`** — Styles matching UI elements.
- **L6216 `.story-final-title::after`** — Styles matching UI elements.
- **L6224 `.story-final-subtitle`** — Styles matching UI elements.
### Css Blocks

- **L6238 `@keyframes storyFireFlicker`** — Styles matching UI elements.
### Css Selectors

- **L6239 `0%`** — Styles matching UI elements.
- **L6240 `25%`** — Styles matching UI elements.
- **L6241 `50%`** — Styles matching UI elements.
- **L6242 `75%`** — Styles matching UI elements.
- **L6243 `100%`** — Styles matching UI elements.
### Css Blocks

- **L6246 `@keyframes storyFlameLick`** — Styles matching UI elements.
### Css Selectors

- **L6247 `0%`** — Styles matching UI elements.
- **L6248 `50%`** — Styles matching UI elements.
- **L6249 `100%`** — Styles matching UI elements.
### Css Blocks

- **L6252 `@keyframes storySubtitleGlow`** — Styles matching UI elements.
### Css Selectors

- **L6253 `0%, 100%`** — Styles matching UI elements.
- **L6254 `50%`** — Styles matching UI elements.
- **L6257 `.story-text.story-text-staggered`** — Styles matching UI elements.
- **L6262 `.story-text.story-text-staggered .story-segment`** — Styles matching UI elements.
- **L6267 `.story-text.story-text-staggered.visible .story-segment-a`** — Styles matching UI elements.
- **L6271 `.story-text.story-text-staggered.visible .story-segment-b`** — Styles matching UI elements.
### Css Blocks

- **L6276 `@keyframes storySegmentFadeIn`** — Styles matching UI elements.
- **L6282 `@keyframes storyTextZoom`** — Styles matching UI elements.
### Css Selectors

- **L6283 `0%`** — Styles matching UI elements.
- **L6287 `12%`** — Styles matching UI elements.
- **L6291 `82%`** — Styles matching UI elements.
- **L6295 `100%`** — Styles matching UI elements.
- **L6302 `.story-skip-btn`** — Styles matching UI elements.
- **L6312 `.story-skip-btn:hover`** — Styles matching UI elements.
- **L6317 `.story-controls`** — Styles matching UI elements.
- **L6328 `.story-controls:hover, .story-controls:focus-within, .story-controls.story-controls-active`** — Styles matching UI elements.
- **L6334 `.story-volume-wrap`** — Styles matching UI elements.
- **L6347 `.story-controls:hover .story-volume-wrap, .story-controls:focus-within .story-volume-wrap, .story-controls.story-controls-active .story-volume-wrap`** — Styles matching UI elements.
- **L6354 `.story-volume-label, .story-volume-value`** — Styles matching UI elements.
- **L6360 `.story-volume-slider`** — Styles matching UI elements.
- **L6365 `.story-mute-btn`** — Styles matching UI elements.
### Css Blocks

- **L6369 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L6370 `.story-controls`** — Styles matching UI elements.
- **L6379 `.story-volume-wrap`** — Styles matching UI elements.
- **L6386 `.story-volume-slider`** — Styles matching UI elements.
- **L6391 `.story-skip-btn`** — Styles matching UI elements.
- **L6396 `.story-text`** — Styles matching UI elements.
- **L6404 `#storyText.big-final, .story-text.big-final`** — Styles matching UI elements.
### Css Blocks

- **L6415 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L6416 `.story-final-title-wrap`** — Styles matching UI elements.
- **L6420 `.story-final-subtitle`** — Styles matching UI elements.
- **L6426 `/* Dark Summoner presence dim */ .board-dim`** — Styles matching UI elements.
- **L6433 `.wallet-hero-bonus-section`** — Styles matching UI elements.
- **L6438 `.wallet-hero-bonus-header`** — Styles matching UI elements.
- **L6445 `.wallet-hero-bonus-title`** — Styles matching UI elements.
- **L6452 `.wallet-hero-refresh-btn`** — Styles matching UI elements.
- **L6456 `.wallet-hero-bonus-body`** — Styles matching UI elements.
- **L6463 `.wallet-hero-slot-group`** — Styles matching UI elements.
- **L6469 `.wallet-hero-slot-heading`** — Styles matching UI elements.
- **L6475 `.wallet-hero-card-list`** — Styles matching UI elements.
- **L6479 `.wallet-hero-card`** — Styles matching UI elements.
- **L6493 `.wallet-hero-card img`** — Styles matching UI elements.
- **L6501 `.wallet-hero-card.is-selected`** — Styles matching UI elements.
- **L6506 `.wallet-hero-card.is-gen0`** — Styles matching UI elements.
- **L6511 `.wallet-hero-card.is-gen0 .wallet-hero-card-title::after`** — Styles matching UI elements.
- **L6514 `.wallet-hero-card.is-gen0 .wallet-hero-card-badge`** — Styles matching UI elements.
- **L6518 `.wallet-hero-card-meta`** — Styles matching UI elements.
- **L6523 `.wallet-hero-card-title`** — Styles matching UI elements.
- **L6527 `.wallet-hero-card-sub`** — Styles matching UI elements.
- **L6531 `.wallet-hero-card-badge`** — Styles matching UI elements.
- **L6537 `.wallet-hero-card-badge-top`** — Styles matching UI elements.
- **L6553 `.wallet-hero-card.is-gen0 .wallet-hero-card-meta`** — Styles matching UI elements.
- **L6556 `.wallet-hero-empty`** — Styles matching UI elements.
- **L6562 `.wallet-hero-slot-toggle`** — Styles matching UI elements.
- **L6575 `.wallet-hero-slot-summary`** — Styles matching UI elements.
- **L6580 `.wallet-hero-slot-chevron`** — Styles matching UI elements.
- **L6584 `.wallet-hero-slot-panel`** — Styles matching UI elements.
- **L6588 `.wallet-hero-slot-panel.is-open`** — Styles matching UI elements.
- **L6591 `.wallet-hero-search-wrap`** — Styles matching UI elements.
- **L6594 `.wallet-hero-search-input`** — Styles matching UI elements.
- **L6603 `.wallet-hero-search-input::placeholder`** — Styles matching UI elements.
- **L6608 `.wallet-hero-image-fallback`** — Styles matching UI elements.
- **L6612 `.wallet-hero-selected-wrap`** — Styles matching UI elements.
- **L6615 `.wallet-hero-selected-label`** — Styles matching UI elements.
- **L6623 `.wallet-hero-selected-card`** — Styles matching UI elements.
- **L6633 `.wallet-hero-selected-card img`** — Styles matching UI elements.
- **L6641 `.wallet-hero-selected-meta`** — Styles matching UI elements.
- **L6646 `.wallet-hero-selected-title`** — Styles matching UI elements.
- **L6651 `.wallet-hero-selected-sub`** — Styles matching UI elements.
- **L6659 `/* v46.9.1.52 intro final-frame hold */ #storyText.story-one-line, .story-text.story-one-line`** — Styles matching UI elements.
- **L6671 `#storyText, .story-text`** — Styles matching UI elements.
- **L6676 `/* Frame 8 big title */ #storyText.big-final, .story-text.big-final`** — Styles matching UI elements.
- **L6698 `.wallet-hero-panel .wallet-hero-panel-body`** — Styles matching UI elements.
- **L6699 `.wallet-hero-panel.collapsed .wallet-hero-panel-body`** — Styles matching UI elements.
- **L6700 `.wallet-hero-panel-toggle`** — Styles matching UI elements.
- **L6701 `.wallet-hero-panel-summary`** — Styles matching UI elements.
- **L6702 `.wallet-hero-panel-body`** — Styles matching UI elements.
- **L6703 `.wallet-hero-bonus-header`** — Styles matching UI elements.
- **L6704 `.leaderboard-nft-cell`** — Styles matching UI elements.
- **L6705 `.leaderboard-nft-cell.is-yes`** — Styles matching UI elements.
- **L6706 `.leaderboard-nft-cell.is-no`** — Styles matching UI elements.
- **L6707 `.leaderboard-table th:nth-child(7), .leaderboard-table td:nth-child(7)`** — Styles matching UI elements.
- **L6714 `.leaderboard-table th:nth-child(8), .leaderboard-table td:nth-child(8)`** — Styles matching UI elements.
- **L6720 `.leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table th, .leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table td`** — Styles matching UI elements.
- **L6726 `.leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table th:nth-child(2), .leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table td:nth-child(2)`** — Styles matching UI elements.
- **L6731 `.leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table th:nth-child(3), .leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table td:nth-child(3)`** — Styles matching UI elements.
- **L6736 `.leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table th:nth-child(4), .leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table td:nth-child...`** — Styles matching UI elements.
- **L6743 `.leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table th:nth-child(6), .leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table td:nth-child(6)`** — Styles matching UI elements.
- **L6748 `.leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table th:nth-child(7), .leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table td:nth-child(7)`** — Styles matching UI elements.
- **L6753 `.leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table th:nth-child(8), .leaderboard-flyout.leaderboard-flyout-daily .leaderboard-table td:nth-child(8)`** — Styles matching UI elements.
- **L6758 `.burned-gold-block`** — Styles matching UI elements.
- **L6763 `.burned-gold-leader-display`** — Styles matching UI elements.
- **L6766 `/* v46.9.1.60 user fix: taller desktop info panel, dark summoner foot-cloud, smaller boss, smaller skitter explosion */ .boss-storm-cloud`** — Styles matching UI elements.
- **L6774 `.boss-storm-cloud-blob`** — Styles matching UI elements.
### Css Blocks

- **L6783 `@keyframes bossStormCloudDrift`** — Styles matching UI elements.
### Css Selectors

- **L6784 `0%`** — Styles matching UI elements.
- **L6785 `25%`** — Styles matching UI elements.
- **L6786 `50%`** — Styles matching UI elements.
- **L6787 `75%`** — Styles matching UI elements.
- **L6788 `100%`** — Styles matching UI elements.
### Css Blocks

- **L6790 `@media (min-width: 1025px)`** — Styles matching UI elements.
### Css Selectors

- **L6791 `:root`** — Styles matching UI elements.
- **L6795 `.right-panel`** — Styles matching UI elements.
- **L6803 `/* DFK Gold swap + relic modal layout hardening */ .relic-modal-card`** — Styles matching UI elements.
- **L6810 `.relic-list`** — Styles matching UI elements.
- **L6818 `.relic-list > *`** — Styles matching UI elements.
- **L6821 `.relic-list > .relic-skip-btn`** — Styles matching UI elements.
- **L6826 `.dfkgold-swap-card`** — Styles matching UI elements.
### Css Blocks

- **L6829 `@media (max-width: 1200px)`** — Styles matching UI elements.
### Css Selectors

- **L6830 `.relic-modal-card`** — Styles matching UI elements.
- **L6834 `.relic-list`** — Styles matching UI elements.
### Css Blocks

- **L6838 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L6839 `.relic-modal-card`** — Styles matching UI elements.
- **L6843 `.relic-list`** — Styles matching UI elements.
### Css Blocks

- **L6847 `@media (max-width: 640px)`** — Styles matching UI elements.
### Css Selectors

- **L6848 `.relic-list`** — Styles matching UI elements.
- **L6854 `.transfer-heroes-toggle`** — Styles matching UI elements.
- **L6855 `.transfer-heroes-modal`** — Styles matching UI elements.
- **L6865 `.transfer-heroes-modal.hidden`** — Styles matching UI elements.
- **L6866 `.transfer-heroes-modal-card`** — Styles matching UI elements.
- **L6874 `.transfer-heroes-header`** — Styles matching UI elements.
- **L6875 `.transfer-heroes-controls`** — Styles matching UI elements.
- **L6876 `.transfer-heroes-field`** — Styles matching UI elements.
- **L6877 `.transfer-heroes-input`** — Styles matching UI elements.
- **L6878 `.transfer-heroes-select`** — Styles matching UI elements.
- **L6879 `.transfer-heroes-input:focus-visible`** — Styles matching UI elements.
- **L6880 `.transfer-heroes-toolbar`** — Styles matching UI elements.
- **L6881 `.transfer-heroes-summary`** — Styles matching UI elements.
- **L6882 `.transfer-heroes-status`** — Styles matching UI elements.
- **L6883 `.transfer-heroes-pagination`** — Styles matching UI elements.
- **L6884 `.transfer-heroes-page-label`** — Styles matching UI elements.
- **L6885 `.transfer-heroes-body`** — Styles matching UI elements.
- **L6886 `.transfer-heroes-empty`** — Styles matching UI elements.
- **L6887 `.transfer-hero-card`** — Styles matching UI elements.
- **L6888 `.transfer-hero-card:hover`** — Styles matching UI elements.
- **L6889 `.transfer-hero-card.is-selected`** — Styles matching UI elements.
- **L6890 `.transfer-hero-card-art-wrap`** — Styles matching UI elements.
- **L6891 `.transfer-hero-card img`** — Styles matching UI elements.
- **L6892 `.transfer-hero-card-meta`** — Styles matching UI elements.
- **L6893 `.transfer-hero-card-topline`** — Styles matching UI elements.
- **L6894 `.transfer-hero-card-title`** — Styles matching UI elements.
- **L6895 `.transfer-hero-card-sub`** — Styles matching UI elements.
- **L6896 `.transfer-hero-card-badge`** — Styles matching UI elements.
- **L6897 `.transfer-heroes-footer`** — Styles matching UI elements.
### Css Blocks

- **L6898 `@media (max-width: 1180px)`** — Styles matching UI elements.
- **L6899 `@media (max-width: 980px)`** — Styles matching UI elements.
- **L6900 `@media (max-width: 640px)`** — Styles matching UI elements.
### Css Selectors

- **L6903 `.burned-gold-display`** — Styles matching UI elements.
- **L6919 `.panel-toggle-row`** — Styles matching UI elements.
- **L6927 `.milestone-hero-offer-card`** — Styles matching UI elements.
- **L6931 `.milestone-hero-offer-actions`** — Styles matching UI elements.
- **L6940 `.milestone-hero-offer-btn`** — Styles matching UI elements.
- **L6944 `.milestone-hero-offer-note`** — Styles matching UI elements.
### Css Blocks

- **L6953 `@media (max-width: 760px)`** — Styles matching UI elements.
### Css Selectors

- **L6954 `.milestone-hero-offer-actions`** — Styles matching UI elements.
- **L6959 `.milestone-hero-offer-btn`** — Styles matching UI elements.
- **L6964 `/* ===== desktop board fill fix ===== */ @media (min-width: 1025px)`** — Styles matching UI elements.
- **L6966 `:root`** — Styles matching UI elements.
- **L6994 `#app`** — Styles matching UI elements.
- **L6998 `.main-layout`** — Styles matching UI elements.
- **L7008 `.center-panel`** — Styles matching UI elements.
- **L7013 `.grid, #grid.grid`** — Styles matching UI elements.
- **L7024 `.bottom-panel`** — Styles matching UI elements.
- **L7029 `.left-panel, .right-panel`** — Styles matching UI elements.
- **L7037 `body.runlog-collapsed`** — Styles matching UI elements.
- **L7041 `body.info-collapsed`** — Styles matching UI elements.
- **L7047 `/* v46.9.1.53 mobile HUD + intro + relic fit fixes */ #storyText.big-final, .story-text.big-final`** — Styles matching UI elements.
### Css Blocks

- **L7059 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L7060 `.mobile-quick-status`** — Styles matching UI elements.
- **L7065 `.relic-modal`** — Styles matching UI elements.
- **L7069 `.relic-modal-card`** — Styles matching UI elements.
- **L7076 `.relic-modal-title`** — Styles matching UI elements.
- **L7081 `.relic-list`** — Styles matching UI elements.
- **L7085 `.relic-choice-card, .dfkgold-swap-card, .relic-list > .panel, .relic-list > .card`** — Styles matching UI elements.
- **L7092 `.relic-choice-card h4, .dfkgold-swap-card h4`** — Styles matching UI elements.
- **L7098 `.relic-choice-card p, .dfkgold-swap-card p, .relic-choice-rarity, .relic-list .gold`** — Styles matching UI elements.
- **L7106 `.relic-list button, .relic-choice-card button, .dfkgold-swap-card button, .relic-skip-btn`** — Styles matching UI elements.
- **L7117 `/* v7 mobile-only hero tile + max level button refinements */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L7119 `.tile-hero-label`** — Styles matching UI elements.
- **L7124 `.tile-small`** — Styles matching UI elements.
- **L7128 `.tile-small-right`** — Styles matching UI elements.
- **L7132 `.hp-bar`** — Styles matching UI elements.
- **L7136 `#mobileBottomBar`** — Styles matching UI elements.
- **L7140 `.mobile-max-level-btn .ability-name`** — Styles matching UI elements.
- **L7144 `.mobile-max-level-btn .ability-meta`** — Styles matching UI elements.
- **L7150 `/* v8.1 mobile-only intro/relic fit cleanup */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L7152 `.known-relics-modal-card .intro-modal-header`** — Styles matching UI elements.
- **L7156 `.known-relics-modal-card #knownRelicsTitle`** — Styles matching UI elements.
- **L7160 `.known-relics-modal-card .intro-body`** — Styles matching UI elements.
- **L7164 `#storyText.big-final, .story-text.big-final`** — Styles matching UI elements.
- **L7172 `.relic-modal`** — Styles matching UI elements.
- **L7177 `.relic-modal-card`** — Styles matching UI elements.
- **L7185 `.relic-modal-title`** — Styles matching UI elements.
- **L7190 `.relic-list`** — Styles matching UI elements.
- **L7194 `.relic-choice-card, .dfkgold-swap-card, .relic-list > .panel, .relic-list > .card`** — Styles matching UI elements.
- **L7201 `.relic-choice-card h4, .dfkgold-swap-card h4`** — Styles matching UI elements.
- **L7208 `.relic-choice-card p, .dfkgold-swap-card p, .relic-choice-rarity, .relic-list .gold`** — Styles matching UI elements.
- **L7217 `.relic-list button, .relic-choice-card button, .dfkgold-swap-card button, .relic-skip-btn`** — Styles matching UI elements.
- **L7229 `/* v12 mobile-only iPhone 12 fit + hero tile text cleanup */ @media (max-width: 900px) and (orientation: landscape)`** — Styles matching UI elements.
- **L7231 `html, body, #app, .main-layout`** — Styles matching UI elements.
- **L7238 `:root`** — Styles matching UI elements.
- **L7249 `#mobileFlyoutStack, #mobileQuickRail, .mobile-flyout-tab, .mobile-quick-btn`** — Styles matching UI elements.
- **L7256 `.mobile-flyout-tab, .mobile-quick-btn`** — Styles matching UI elements.
- **L7262 `.tile-hero-warrior .tile-hero-label`** — Styles matching UI elements.
- **L7267 `.tile-torn-soul-label`** — Styles matching UI elements.
- **L7274 `.tile-pure-energy-label`** — Styles matching UI elements.
- **L7283 `.tile-archer-shadow-label`** — Styles matching UI elements.
- **L7294 `.tile-shadow-waves-badge`** — Styles matching UI elements.
- **L7310 `.tile-shadow-waves-label, .tile-shadow-waves-count`** — Styles matching UI elements.
- **L7317 `.tile-shadow-waves-label`** — Styles matching UI elements.
- **L7322 `.tile-shadow-waves-count`** — Styles matching UI elements.
- **L7328 `/* v16 mobile-only fix: render hero art as the actual button background instead of Safari-fragile pseudo layers */ @media (max-width: 1024px) and (orientatio...`** — Styles matching UI elements.
- **L7330 `.mobile-bottom-btn.has-art, .mobile-ability-btn.has-art`** — Styles matching UI elements.
- **L7342 `.mobile-bottom-btn.has-art::before, .mobile-ability-btn.has-art::before, .mobile-bottom-btn.has-art::after, .mobile-ability-btn.has-art::after`** — Styles matching UI elements.
- **L7350 `.mobile-bottom-btn.has-art > *, .mobile-ability-btn.has-art > *, .mobile-bottom-btn.has-art .ability-name, .mobile-bottom-btn.has-art .ability-meta, .mobile-...`** — Styles matching UI elements.
- **L7360 `.mobile-bottom-btn.has-art:disabled, .mobile-ability-btn.has-art:disabled`** — Styles matching UI elements.
### Css Blocks

- **L7367 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L7369 `#mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn`** — Styles matching UI elements.
- **L7384 `#mobileBottomBar .mobile-btn-art-slot`** — Styles matching UI elements.
- **L7400 `#mobileBottomBar .mobile-btn-copy`** — Styles matching UI elements.
- **L7416 `#mobileBottomBar .mobile-btn-bg`** — Styles matching UI elements.
- **L7428 `#mobileBottomBar .mobile-btn-bg-img`** — Styles matching UI elements.
- **L7440 `#mobileBottomBar .mobile-btn-bg--empty`** — Styles matching UI elements.
- **L7444 `#mobileBottomBar .mobile-bottom-btn .ability-name, #mobileBottomBar .mobile-bottom-btn .ability-meta, #mobileBottomBar .mobile-ability-btn .ability-name, #mo...`** — Styles matching UI elements.
- **L7453 `#mobileBottomBar .mobile-bottom-btn:disabled, #mobileBottomBar .mobile-ability-btn:disabled`** — Styles matching UI elements.
### Css Blocks

- **L7460 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L7461 `#mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn`** — Styles matching UI elements.
- **L7475 `#mobileBottomBar .mobile-bottom-btn.has-art::before, #mobileBottomBar .mobile-bottom-btn.has-art::after, #mobileBottomBar .mobile-ability-btn.has-art::before...`** — Styles matching UI elements.
- **L7484 `#mobileBottomBar .mobile-btn-art-slot`** — Styles matching UI elements.
- **L7500 `#mobileBottomBar .mobile-btn-art-slot--empty`** — Styles matching UI elements.
- **L7504 `#mobileBottomBar .mobile-btn-art-img`** — Styles matching UI elements.
- **L7517 `#mobileBottomBar .mobile-btn-copy`** — Styles matching UI elements.
- **L7528 `#mobileBottomBar .mobile-bottom-btn .ability-name, #mobileBottomBar .mobile-bottom-btn .ability-meta, #mobileBottomBar .mobile-ability-btn .ability-name, #mo...`** — Styles matching UI elements.
- **L7538 `#mobileBottomBar .mobile-bottom-btn .ability-name, #mobileBottomBar .mobile-ability-btn .ability-name`** — Styles matching UI elements.
- **L7546 `#mobileBottomBar .mobile-bottom-btn .ability-meta, #mobileBottomBar .mobile-ability-btn .ability-meta`** — Styles matching UI elements.
- **L7554 `#mobileBottomBar .mobile-bottom-btn:disabled, #mobileBottomBar .mobile-ability-btn:disabled`** — Styles matching UI elements.
- **L7561 `/* v21 mobile-only cleanup: restore board backdrop, remove button backgrounds, tighten dock height */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L7563 `body, #app, .main-layout, .center-panel`** — Styles matching UI elements.
- **L7570 `body::before`** — Styles matching UI elements.
- **L7576 `#mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn`** — Styles matching UI elements.
- **L7588 `#mobileBottomBar .mobile-btn-art-slot, #mobileBottomBar .mobile-btn-art-slot--empty`** — Styles matching UI elements.
- **L7599 `#mobileBottomBar .mobile-btn-art-img`** — Styles matching UI elements.
- **L7607 `#mobileBottomBar .mobile-btn-copy`** — Styles matching UI elements.
- **L7615 `#mobileBottomBar .mobile-btn-bg, #mobileBottomBar .mobile-btn-bg-img, #mobileBottomBar .mobile-btn-bg--empty`** — Styles matching UI elements.
- **L7621 `#mobileBottomBar .mobile-bottom-btn .ability-name, #mobileBottomBar .mobile-bottom-btn .ability-meta, #mobileBottomBar .mobile-ability-btn .ability-name, #mo...`** — Styles matching UI elements.
### Css Blocks

- **L7629 `@media (max-width: 900px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L7630 `body, #app, .main-layout, .center-panel`** — Styles matching UI elements.
- **L7639 `/* v22 mobile tint + satellite readiness cue */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L7641 `.mobile-flyout-tab, .mobile-quick-btn, #mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn, #mobileBottomBar .mobile-btn-copy, #mobileQ...`** — Styles matching UI elements.
- **L7653 `.mobile-flyout-tab, .mobile-quick-btn, #mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn`** — Styles matching UI elements.
- **L7660 `.mobile-quick-start`** — Styles matching UI elements.
- **L7664 `#mobileQuickStatus`** — Styles matching UI elements.
- **L7668 `#mobileBottomBar .mobile-btn-art-slot, #mobileBottomBar .mobile-btn-art-slot--empty`** — Styles matching UI elements.
- **L7673 `#mobileQuickSatelliteBtn`** — Styles matching UI elements.
- **L7677 `#mobileQuickSatelliteBtn.has-ready-dot::after`** — Styles matching UI elements.
- **L7691 `/* v26 mobile ability width + clearer locked/cooldown states */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L7693 `#mobileBottomBar`** — Styles matching UI elements.
- **L7697 `#mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn`** — Styles matching UI elements.
- **L7705 `#mobileBottomBar .mobile-bottom-btn.is-ready, #mobileBottomBar .mobile-ability-btn.is-ready`** — Styles matching UI elements.
- **L7711 `#mobileBottomBar .mobile-bottom-btn.is-cooldown, #mobileBottomBar .mobile-ability-btn.is-cooldown`** — Styles matching UI elements.
- **L7719 `#mobileBottomBar .mobile-bottom-btn.is-locked, #mobileBottomBar .mobile-ability-btn.is-locked, #mobileBottomBar .mobile-bottom-btn.is-empty, #mobileBottomBar...`** — Styles matching UI elements.
- **L7731 `#mobileBottomBar .mobile-bottom-btn.is-cooldown .ability-meta, #mobileBottomBar .mobile-ability-btn.is-cooldown .ability-meta`** — Styles matching UI elements.
- **L7737 `#mobileBottomBar .mobile-bottom-btn.is-locked .ability-meta, #mobileBottomBar .mobile-ability-btn.is-locked .ability-meta, #mobileBottomBar .mobile-bottom-bt...`** — Styles matching UI elements.
- **L7749 `/* v27 mobile spacing tune: pull left quick rail closer to board and tighten ability dock */ @media (max-width: 1024px) and (min-width: 901px) and (orientati...`** — Styles matching UI elements.
- **L7751 `:root`** — Styles matching UI elements.
- **L7755 `#mobileBottomBar`** — Styles matching UI elements.
### Css Blocks

- **L7763 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L7764 `#mobileBottomBar`** — Styles matching UI elements.
- **L7770 `#mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn`** — Styles matching UI elements.
- **L7778 `/* v29 revert ability dock width, lock dock to board edges, and let board expand to available right-side space */ @media (max-width: 1024px) and (orientation...`** — Styles matching UI elements.
- **L7780 `:root`** — Styles matching UI elements.
- **L7792 `.center-panel`** — Styles matching UI elements.
- **L7797 `#grid.grid, .grid`** — Styles matching UI elements.
- **L7810 `.tile, .grid > .tile`** — Styles matching UI elements.
- **L7816 `#mobileBottomBar.mobile-bottom-bar, #mobileBottomBar`** — Styles matching UI elements.
- **L7828 `#mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn`** — Styles matching UI elements.
- **L7837 `.status-overlay`** — Styles matching UI elements.
- **L7844 `/* v31: force mobile ability buttons under the board and keep all 4 visible */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L7846 `:root`** — Styles matching UI elements.
- **L7859 `.center-panel`** — Styles matching UI elements.
- **L7865 `#grid.grid, .grid`** — Styles matching UI elements.
- **L7879 `#mobileBottomBar, #mobileBottomBar.mobile-bottom-bar`** — Styles matching UI elements.
- **L7901 `#mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn, #mobileAbilityBtn1, #mobileAbilityBtn2, #mobileAbilityBtn3, #mobileAbilityBtn4`** — Styles matching UI elements.
- **L7920 `/* v32 mobile landscape hard reset: ability dock spans under board area, not the left rail */ @media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
- **L7922 `:root`** — Styles matching UI elements.
- **L7931 `.center-panel`** — Styles matching UI elements.
- **L7939 `#grid.grid, .grid`** — Styles matching UI elements.
- **L7945 `#mobileBottomBar, #mobileBottomBar.mobile-bottom-bar`** — Styles matching UI elements.
- **L7970 `#mobileBottomBar .mobile-bottom-btn, #mobileBottomBar .mobile-ability-btn, #mobileAbilityBtn1, #mobileAbilityBtn2, #mobileAbilityBtn3, #mobileAbilityBtn4`** — Styles matching UI elements.
- **L7990 `#mobileBottomBar .mobile-btn-copy`** — Styles matching UI elements.
- **L7995 `.status-overlay`** — Styles matching UI elements.
- **L8007 `#startModeModal.modal-primed-under-intro`** — Styles matching UI elements.
- **L8014 `#startModeModal.modal-primed-under-intro .intro-modal-card`** — Styles matching UI elements.
- **L8018 `body.story-active #storyOverlay`** — Styles matching UI elements.
- **L8022 `body.story-active #startModeModal.modal-primed-under-intro`** — Styles matching UI elements.
- **L8028 `body.story-active #startModeModal.modal-primed-under-intro .intro-modal-card, body.story-active #startModeModal.modal-primed-under-intro button`** — Styles matching UI elements.
- **L8033 `.start-mode-modal-card`** — Styles matching UI elements.
- **L8036 `.start-mode-modal-footer`** — Styles matching UI elements.
- **L8040 `.seer-intro-footer`** — Styles matching UI elements.
- **L8044 `.choice-modal-note`** — Styles matching UI elements.
- **L8051 `.choice-modal-note.hidden`** — Styles matching UI elements.
- **L8055 `.seer-intro-modal-card`** — Styles matching UI elements.
- **L8058 `.seer-intro-body`** — Styles matching UI elements.
- **L8062 `.seer-intro-media-wrap`** — Styles matching UI elements.
- **L8068 `.seer-intro-image`** — Styles matching UI elements.
- **L8079 `.seer-intro-summary`** — Styles matching UI elements.
- **L8083 `.seer-intro-summary p:last-child`** — Styles matching UI elements.
### Css Blocks

- **L8086 `@media (max-width: 768px)`** — Styles matching UI elements.
### Css Selectors

- **L8087 `.seer-intro-media-wrap`** — Styles matching UI elements.
- **L8092 `.seer-intro-image`** — Styles matching UI elements.
- **L8097 `#startModeModal.start-mode-interactive`** — Styles matching UI elements.
- **L8098 `#startModeModal.start-mode-interactive .intro-modal-card`** — Styles matching UI elements.
- **L8099 `#startModeModal.start-mode-interactive button`** — Styles matching UI elements.
- **L8101 `/* leaderboard weekly archive refresh */ .leaderboard-flyout-header-compact`** — Styles matching UI elements.
- **L8107 `.leaderboard-title-compact`** — Styles matching UI elements.
- **L8112 `.leaderboard-reset-copy`** — Styles matching UI elements.
- **L8119 `.leaderboard-controls-compact`** — Styles matching UI elements.
- **L8126 `.leaderboard-period-actions, .leaderboard-range-row`** — Styles matching UI elements.
- **L8134 `.leaderboard-range-controls`** — Styles matching UI elements.
- **L8144 `.leaderboard-range-copy, .leaderboard-range-display`** — Styles matching UI elements.
- **L8150 `.leaderboard-range-display`** — Styles matching UI elements.
- **L8155 `.leaderboard-period-btn, .leaderboard-range-btn, .leaderboard-date-input`** — Styles matching UI elements.
- **L8165 `.leaderboard-period-btn, .leaderboard-range-btn`** — Styles matching UI elements.
- **L8171 `.leaderboard-period-btn.active`** — Styles matching UI elements.
- **L8176 `.leaderboard-range-field`** — Styles matching UI elements.
- **L8185 `.leaderboard-date-input`** — Styles matching UI elements.
- **L8190 `.leaderboard-sortable`** — Styles matching UI elements.
- **L8195 `.leaderboard-sortable:focus-visible`** — Styles matching UI elements.
- **L8200 `.leaderboard-sortable .leaderboard-sort-chevron`** — Styles matching UI elements.
- **L8207 `.leaderboard-sortable.is-active`** — Styles matching UI elements.
- **L8211 `.leaderboard-flyout-header .leaderboard-kicker`** — Styles matching UI elements.
- **L8215 `.leaderboard-close, .leaderboard-refresh-btn, .leaderboard-period-btn, .leaderboard-range-btn`** — Styles matching UI elements.
- **L8222 `.leaderboard-close`** — Styles matching UI elements.
### Css Blocks

- **L8228 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L8229 `.leaderboard-range-row`** — Styles matching UI elements.
- **L8233 `.leaderboard-range-field`** — Styles matching UI elements.
- **L8237 `.leaderboard-range-btn, .leaderboard-period-btn, .leaderboard-refresh-btn`** — Styles matching UI elements.
- **L8246 `.reward-claims-admin`** — Styles matching UI elements.
- **L8251 `.reward-claims-admin.hidden`** — Styles matching UI elements.
- **L8254 `.reward-claims-admin-header`** — Styles matching UI elements.
- **L8261 `.reward-claims-admin-title`** — Styles matching UI elements.
- **L8266 `.reward-claims-admin-body`** — Styles matching UI elements.
- **L8273 `.reward-claim-card`** — Styles matching UI elements.
- **L8281 `.reward-claim-card.is-pending`** — Styles matching UI elements.
- **L8284 `.reward-claim-card.is-approved, .reward-claim-card.is-paid`** — Styles matching UI elements.
- **L8288 `.reward-claim-card.is-rejected`** — Styles matching UI elements.
- **L8291 `.reward-claim-card-top`** — Styles matching UI elements.
- **L8297 `.reward-claim-card-title`** — Styles matching UI elements.
- **L8301 `.reward-claim-card-status`** — Styles matching UI elements.
- **L8310 `.reward-claim-card-status.status-pending`** — Styles matching UI elements.
- **L8313 `.reward-claim-card-status.status-approved, .reward-claim-card-status.status-paid`** — Styles matching UI elements.
- **L8317 `.reward-claim-card-status.status-rejected`** — Styles matching UI elements.
- **L8320 `.reward-claim-card-amount`** — Styles matching UI elements.
- **L8325 `.reward-claim-card-grid`** — Styles matching UI elements.
- **L8330 `.reward-claim-label`** — Styles matching UI elements.
- **L8338 `.reward-claim-value`** — Styles matching UI elements.
- **L8343 `.reward-claim-value.mono`** — Styles matching UI elements.
- **L8347 `.reward-claim-admin-note`** — Styles matching UI elements.
- **L8350 `.reward-claims-admin-empty`** — Styles matching UI elements.
- **L8357 `.reward-claim-whitelist-badge`** — Styles matching UI elements.
- **L8369 `.reward-claim-actions`** — Styles matching UI elements.
- **L8375 `.reward-claim-action-btn`** — Styles matching UI elements.
- **L8386 `.reward-claim-action-btn.is-good`** — Styles matching UI elements.
- **L8390 `.reward-claim-action-btn.is-danger`** — Styles matching UI elements.
- **L8394 `.reward-claim-action-btn:disabled`** — Styles matching UI elements.
- **L8400 `.champion-header-row`** — Styles matching UI elements.
- **L8401 `#championPanel.collapsed #championPanelBody`** — Styles matching UI elements.
- **L8402 `.champion-collapsed-preview`** — Styles matching UI elements.
- **L8403 `.champion-collapsed-preview-card`** — Styles matching UI elements.
- **L8404 `.champion-collapsed-preview-portrait`** — Styles matching UI elements.
- **L8405 `.champion-collapsed-preview-class`** — Styles matching UI elements.
- **L8406 `.champion-collapsed-preview-line`** — Styles matching UI elements.
- **L8409 `.lore-toggle`** — Styles matching UI elements.
- **L8412 `.projectile-effect-big-sword`** — Styles matching UI elements.
- **L8416 `.champion-modal-note`** — Styles matching UI elements.
- **L8417 `#championModal`** — Styles matching UI elements.
- **L8418 `#championModal .intro-modal-card`** — Styles matching UI elements.
- **L8419 `#championLockModal`** — Styles matching UI elements.
- **L8420 `#championLockModal .intro-modal-card`** — Styles matching UI elements.
- **L8423 `.champion-collapsed-preview-card`** — Styles matching UI elements.
- **L8424 `.champion-collapsed-preview-meta`** — Styles matching UI elements.
- **L8425 `.champion-collapsed-preview-class`** — Styles matching UI elements.
- **L8426 `.champion-collapsed-preview-line`** — Styles matching UI elements.
- **L8427 `.champion-collapsed-preview-wait`** — Styles matching UI elements.
- **L8428 `.champion-quick-deploy-btn`** — Styles matching UI elements.
- **L8429 `.projectile-effect-big-sword`** — Styles matching UI elements.
- **L8432 `.ability-row button:disabled, .tile-hover-skill-btn:disabled`** — Styles matching UI elements.
- **L8440 `.tile-buff-indicator`** — Styles matching UI elements.
- **L8455 `.tile-buff-indicator-sage`** — Styles matching UI elements.
- **L8463 `.hero-action-disabled, #upgradeBtn:disabled, #moveBtn:disabled, #maxLevelBtn:disabled`** — Styles matching UI elements.
- **L8474 `.tile-pure-energy`** — Styles matching UI elements.
- **L8478 `.tile-pure-energy::after`** — Styles matching UI elements.
### Css Blocks

- **L8487 `@keyframes pureEnergyPulse`** — Styles matching UI elements.
### Css Selectors

- **L8493 `/* Seer intro header polish */ .seer-intro-header`** — Styles matching UI elements.
- **L8499 `.seer-intro-title`** — Styles matching UI elements.
- **L8502 `.seer-intro-image-frame`** — Styles matching UI elements.
- **L8507 `.seer-intro-image-label`** — Styles matching UI elements.
- **L8521 `.seer-intro-image`** — Styles matching UI elements.
### Css Blocks

- **L8524 `@media (max-width: 768px)`** — Styles matching UI elements.
### Css Selectors

- **L8525 `.seer-intro-image-frame`** — Styles matching UI elements.
- **L8528 `.seer-intro-image-label`** — Styles matching UI elements.
- **L8535 `.projectile-effect-spellbow`** — Styles matching UI elements.
- **L8544 `.tile.range-champion_dragoon::before`** — Styles matching UI elements.
- **L8545 `.tile.range-champion_dreadknight::before`** — Styles matching UI elements.
- **L8546 `.tile.range-champion_sage::before`** — Styles matching UI elements.
- **L8548 `.tile-dragoon-glow-badge, .tile-dragoon-command-badge`** — Styles matching UI elements.
- **L8564 `.tile-dragoon-glow-badge`** — Styles matching UI elements.
- **L8569 `.tile-dragoon-command-badge`** — Styles matching UI elements.
- **L8576 `.champion-card-side`** — Styles matching UI elements.
- **L8577 `.champion-card-side-toggle.champion-card-side-compact`** — Styles matching UI elements.
- **L8578 `.champion-card-header-compact`** — Styles matching UI elements.
- **L8579 `.champion-card-portrait-compact`** — Styles matching UI elements.
- **L8580 `.champion-card-headtext-compact`** — Styles matching UI elements.
- **L8581 `.champion-card-headtext-compact h3`** — Styles matching UI elements.
- **L8582 `.champion-card-meta-compact`** — Styles matching UI elements.
- **L8583 `.champion-card-side .champion-chip`** — Styles matching UI elements.
- **L8584 `.champion-card-side-details`** — Styles matching UI elements.
- **L8585 `.champion-collapsed-preview-card`** — Styles matching UI elements.
- **L8586 `.champion-collapsed-preview-portrait`** — Styles matching UI elements.
- **L8587 `.champion-collapsed-preview-class`** — Styles matching UI elements.
- **L8588 `.champion-collapsed-preview-line`** — Styles matching UI elements.
- **L8589 `.champion-collapsed-preview-wait`** — Styles matching UI elements.
- **L8592 `/* =================================================================== FLUID BOARD: panels shrink as viewport narrows so the game board always fits horizonta...`** — Styles matching UI elements.
- **L8605 `:root`** — Styles matching UI elements.
- **L8609 `.right-panel`** — Styles matching UI elements.
- **L8612 `/* 1025–1160 px: board needs ~745px, panels at 175px, gap tightens */ @media (min-width: 1025px) and (max-width: 1160px)`** — Styles matching UI elements.
- **L8614 `:root`** — Styles matching UI elements.
- **L8619 `.right-panel`** — Styles matching UI elements.
- **L8622 `/* 1025–1080 px: panels at 148/152px, gap tightens to 4px */ @media (min-width: 1025px) and (max-width: 1080px)`** — Styles matching UI elements.
- **L8624 `:root`** — Styles matching UI elements.
- **L8629 `.right-panel, .left-panel`** — Styles matching UI elements.
- **L8632 `/* 1025–1030 px: tightest desktop, panels at 128/132px */ @media (min-width: 1025px) and (max-width: 1030px)`** — Styles matching UI elements.
- **L8634 `:root`** — Styles matching UI elements.
- **L8642 `.reward-claims-admin-subtitle`** — Styles matching UI elements.
- **L8643 `.reward-claims-admin-whitelist`** — Styles matching UI elements.
- **L8644 `.reward-claims-admin-whitelist-form`** — Styles matching UI elements.
- **L8645 `.reward-claims-input`** — Styles matching UI elements.
- **L8646 `.reward-claims-check`** — Styles matching UI elements.
- **L8647 `.reward-claims-admin-whitelist-list`** — Styles matching UI elements.
- **L8648 `.reward-claim-whitelist-row`** — Styles matching UI elements.
- **L8649 `.reward-claim-whitelist-pill`** — Styles matching UI elements.
- **L8650 `.reward-claim-whitelist-pill.is-on`** — Styles matching UI elements.
- **L8651 `.reward-claim-whitelist-pill.is-off`** — Styles matching UI elements.
- **L8652 `.reward-claim-whitelist-wallet`** — Styles matching UI elements.
- **L8653 `.reward-claim-whitelist-notes`** — Styles matching UI elements.
- **L8654 `.reward-claim-whitelist-actions`** — Styles matching UI elements.
### Css Blocks

- **L8655 `@media (max-width: 1200px)`** — Styles matching UI elements.
### Css Selectors

- **L8658 `.treasury-flyout`** — Styles matching UI elements.
- **L8667 `#treasuryFlyoutBackdrop`** — Styles matching UI elements.
- **L8673 `.treasury-flyout-scroll`** — Styles matching UI elements.
- **L8682 `.treasury-flyout .reward-claims-admin`** — Styles matching UI elements.
- **L8686 `.treasury-flyout .wallet-profile-balance, .treasury-flyout .wallet-tracking-summary`** — Styles matching UI elements.
- **L8691 `.treasury-summary-card`** — Styles matching UI elements.
- **L8697 `.treasury-summary-card-primary`** — Styles matching UI elements.
- **L8702 `.treasury-summary-title`** — Styles matching UI elements.
- **L8710 `.treasury-summary-values`** — Styles matching UI elements.
- **L8716 `.treasury-summary-value`** — Styles matching UI elements.
- **L8720 `.treasury-summary-value strong`** — Styles matching UI elements.
- **L8724 `.treasury-summary-breakdown`** — Styles matching UI elements.
- **L8727 `.treasury-summary-breakdown strong`** — Styles matching UI elements.
- **L8730 `.reward-claims-section-header`** — Styles matching UI elements.
- **L8737 `.reward-claims-section-toggle`** — Styles matching UI elements.
- **L8750 `.reward-claims-section-toggle .chev`** — Styles matching UI elements.
- **L8754 `.reward-claims-admin-group.is-collapsed .reward-claims-section-body`** — Styles matching UI elements.
- **L8757 `.reward-spend-row`** — Styles matching UI elements.
- **L8760 `.reward-spend-wallet`** — Styles matching UI elements.
- **L8766 `.reward-raffle-history-list`** — Styles matching UI elements.
- **L8770 `.reward-raffle-history-row`** — Styles matching UI elements.
- **L8780 `.reward-raffle-day`** — Styles matching UI elements.
- **L8784 `.reward-raffle-winner`** — Styles matching UI elements.
- **L8787 `.reward-raffle-winner-name`** — Styles matching UI elements.
- **L8791 `.reward-raffle-winner-wallet`** — Styles matching UI elements.
- **L8798 `.reward-raffle-pill`** — Styles matching UI elements.
- **L8810 `.reward-raffle-status`** — Styles matching UI elements.
- **L8816 `.menu-resource-strip`** — Styles matching UI elements.
- **L8824 `.menu-resource-row`** — Styles matching UI elements.
- **L8830 `.menu-resource-row + .menu-resource-row`** — Styles matching UI elements.
- **L8833 `.menu-resource-label`** — Styles matching UI elements.
- **L8836 `.jewel-received-lightwindow-backdrop`** — Styles matching UI elements.
- **L8846 `.jewel-received-lightwindow`** — Styles matching UI elements.
- **L8856 `.jewel-received-kicker`** — Styles matching UI elements.
- **L8862 `.jewel-received-title`** — Styles matching UI elements.
- **L8869 `.jewel-received-copy`** — Styles matching UI elements.
- **L8875 `.jewel-received-close`** — Styles matching UI elements.
- **L8886 `#walletPanelToggle .wallet-panel-title-row`** — Styles matching UI elements.
- **L8892 `#walletPanelToggle .wallet-status`** — Styles matching UI elements.
- **L8897 `#walletJewelBalance, #walletDfkgoldBalance`** — Styles matching UI elements.
- **L8901 `.wallet-top-balances`** — Styles matching UI elements.
- **L8911 `.wallet-top-balance`** — Styles matching UI elements.
- **L8918 `#buttonsPanel .wallet-status`** — Styles matching UI elements.
- **L8919 `.buttons-panel-body`** — Styles matching UI elements.
- **L8923 `.modal-top-toggle`** — Styles matching UI elements.
- **L8928 `.modal-top-toggle.compact`** — Styles matching UI elements.
- **L8931 `.modal-top-toggle-btn`** — Styles matching UI elements.
- **L8943 `.modal-top-toggle-btn.active`** — Styles matching UI elements.
- **L8947 `.quests-modal-card, .bounty-modal-card`** — Styles matching UI elements.
- **L8951 `.quests-body, .bounty-body`** — Styles matching UI elements.
- **L8956 `.quests-grid, .bounty-grid`** — Styles matching UI elements.
- **L8960 `.quest-card`** — Styles matching UI elements.
- **L8964 `.bounty-card`** — Styles matching UI elements.
- **L8968 `.quest-progress-row`** — Styles matching UI elements.
- **L8972 `.quest-title, .quest-name, .bounty-title`** — Styles matching UI elements.
- **L8977 `.quest-card .quest-progress-text, .bounty-card .bounty-detail, .bounty-card .bounty-meta, .bounty-card .bounty-eligibility, .bounty-card .bounty-claimant`** — Styles matching UI elements.
- **L8985 `.bounty-card .bounty-tier-label, .bounty-card .bounty-reward-pill, .bounty-card .bounty-state-chip, .quest-card .quest-tier-label, .quest-card .quest-reward-...`** — Styles matching UI elements.
- **L8993 `.bounty-card .small-action, .quest-card .small-action, .quest-card button, .bounty-card button`** — Styles matching UI elements.
- **L9001 `.wallet-top-balance-small`** — Styles matching UI elements.
- **L9007 `#walletTrackingSummary`** — Styles matching UI elements.
- **L9009 `.wallet-top-balance-row`** — Styles matching UI elements.
- **L9015 `.wallet-top-refresh`** — Styles matching UI elements.
- **L9027 `.wallet-top-refresh:disabled`** — Styles matching UI elements.
- **L9033 `.reward-claims-rollup-btn`** — Styles matching UI elements.
- **L9046 `.reward-claims-admin-whitelist.is-collapsed .reward-claims-admin-whitelist-form, .reward-claims-admin-whitelist.is-collapsed .reward-claims-admin-whitelist-list`** — Styles matching UI elements.
- **L9050 `.reward-spend-controls`** — Styles matching UI elements.
- **L9056 `.reward-spend-filter-btn`** — Styles matching UI elements.
- **L9067 `.reward-spend-filter-btn.active`** — Styles matching UI elements.
- **L9073 `/* Enlarged reward claims viewing area */ .reward-claims-admin-group`** — Styles matching UI elements.
- **L9077 `.reward-claims-admin-group .reward-claims-admin-subtitle`** — Styles matching UI elements.
- **L9080 `.reward-claim-card`** — Styles matching UI elements.
- **L9084 `.reward-claim-card-grid`** — Styles matching UI elements.
- **L9088 `.reward-claim-card-title`** — Styles matching UI elements.
- **L9091 `.reward-claim-card-amount`** — Styles matching UI elements.
- **L9094 `.reward-claim-value, .reward-claim-label, .reward-claim-admin-note, .reward-claim-whitelist-wallet, .reward-claim-whitelist-notes`** — Styles matching UI elements.
- **L9101 `.reward-claim-actions`** — Styles matching UI elements.
- **L9105 `.reward-claim-action-btn`** — Styles matching UI elements.
- **L9109 `#rewardClaimsAdminBody`** — Styles matching UI elements.
- **L9114 `.reward-claim-spend-list`** — Styles matching UI elements.
- **L9120 `/* Withdrawal tabs and smaller request cards */ .reward-claims-tabs`** — Styles matching UI elements.
- **L9127 `.reward-claims-tab-btn`** — Styles matching UI elements.
- **L9138 `.reward-claims-tab-btn.active`** — Styles matching UI elements.
- **L9142 `.reward-claims-tab-count`** — Styles matching UI elements.
- **L9152 `.reward-claims-pagination`** — Styles matching UI elements.
- **L9159 `.reward-claims-page-label`** — Styles matching UI elements.
- **L9164 `/* make withdrawal request containers/fonts ~25% smaller */ .reward-claim-card`** — Styles matching UI elements.
- **L9169 `.reward-claim-card-grid`** — Styles matching UI elements.
- **L9172 `.reward-claim-card-title`** — Styles matching UI elements.
- **L9175 `.reward-claim-card-amount`** — Styles matching UI elements.
- **L9178 `.reward-claim-value, .reward-claim-label, .reward-claim-admin-note, .reward-claim-whitelist-wallet, .reward-claim-whitelist-notes`** — Styles matching UI elements.
- **L9185 `.reward-claim-actions`** — Styles matching UI elements.
- **L9189 `.reward-claim-action-btn`** — Styles matching UI elements.
- **L9194 `.reward-claim-card.is-collapsible .reward-claim-card-top, .reward-claim-card.is-collapsible .reward-claim-card-grid, .reward-claim-card.is-collapsible .rewar...`** — Styles matching UI elements.
- **L9199 `.reward-claim-card.is-collapsible.open .reward-claim-card-top, .reward-claim-card.is-collapsible.open .reward-claim-card-grid, .reward-claim-card.is-collapsi...`** — Styles matching UI elements.
- **L9204 `.reward-claim-summary`** — Styles matching UI elements.
- **L9212 `.reward-claim-card.is-collapsible`** — Styles matching UI elements.
- **L9215 `.reward-claim-summary`** — Styles matching UI elements.
- **L9221 `.reward-claim-summary::after`** — Styles matching UI elements.
- **L9227 `.reward-claim-card.is-collapsible.open .reward-claim-summary::after`** — Styles matching UI elements.
- **L9230 `.reward-claim-summary-main`** — Styles matching UI elements.
- **L9233 `.reward-claim-summary-sub`** — Styles matching UI elements.
- **L9239 `#rewardClaimsAdminHeader`** — Styles matching UI elements.
- **L9242 `#rewardClaimsAdminHeader::after`** — Styles matching UI elements.
- **L9248 `#rewardClaimsAdminHeader.is-collapsed::after`** — Styles matching UI elements.
- **L9253 `/* V10.2.8 daily quest modal layout refresh */ .bounty-modal-card`** — Styles matching UI elements.
- **L9258 `.bounty-body`** — Styles matching UI elements.
- **L9262 `.bounty-grid.quests-grid`** — Styles matching UI elements.
- **L9267 `.quest-card`** — Styles matching UI elements.
- **L9272 `.quest-card .bounty-card-title`** — Styles matching UI elements.
- **L9278 `.quest-card .bounty-card-copy`** — Styles matching UI elements.
- **L9284 `.quest-card .bounty-tier-label`** — Styles matching UI elements.
- **L9288 `.quest-card .bounty-tier-index`** — Styles matching UI elements.
- **L9294 `.quest-card .bounty-reward-pill, .quest-card .bounty-state-chip`** — Styles matching UI elements.
- **L9300 `.quest-card .bounty-chain-note`** — Styles matching UI elements.
- **L9305 `.quest-card .bounty-claim-btn`** — Styles matching UI elements.
- **L9311 `.quest-card .bounty-status-banner`** — Styles matching UI elements.
- **L9317 `.quest-card .quest-progress-row`** — Styles matching UI elements.
- **L9321 `.quest-card .quest-progress-text`** — Styles matching UI elements.
### Css Blocks

- **L9325 `@media (max-width: 1200px)`** — Styles matching UI elements.
### Css Selectors

- **L9326 `.bounty-grid.quests-grid`** — Styles matching UI elements.
### Css Blocks

- **L9331 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L9332 `.bounty-grid.quests-grid`** — Styles matching UI elements.
### Css Blocks

- **L9337 `@media (max-width: 640px)`** — Styles matching UI elements.
### Css Selectors

- **L9338 `.bounty-grid.quests-grid`** — Styles matching UI elements.
- **L9344 `/* V10.2.9 widen dailies/bounties lightwindow */ #questsModal .intro-modal-card.bounty-modal-card, #bountyModal .intro-modal-card.bounty-modal-card, #questsM...`** — Styles matching UI elements.
- **L9354 `#questsModal .intro-body.bounty-body, #bountyModal .intro-body.bounty-body`** — Styles matching UI elements.
### Css Blocks

- **L9359 `@media (max-width: 1600px)`** — Styles matching UI elements.
### Css Selectors

- **L9360 `#questsModal .intro-modal-card.bounty-modal-card, #bountyModal .intro-modal-card.bounty-modal-card, #questsModal .bounty-modal-card, #bountyModal .bounty-mod...`** — Styles matching UI elements.
- **L9370 `/* V10.3.0 force wider dailies / bounties modal */ body #questsModal.intro-modal, body #bountyModal.intro-modal`** — Styles matching UI elements.
- **L9376 `body #questsModal .intro-modal-card.bounty-modal-card, body #bountyModal .intro-modal-card.bounty-modal-card, body #questsModal .bounty-modal-card, body #bou...`** — Styles matching UI elements.
- **L9385 `body #questsModal .intro-body.bounty-body, body #bountyModal .intro-body.bounty-body`** — Styles matching UI elements.
### Css Blocks

- **L9390 `@media (max-width: 1700px)`** — Styles matching UI elements.
### Css Selectors

- **L9391 `body #questsModal .intro-modal-card.bounty-modal-card, body #bountyModal .intro-modal-card.bounty-modal-card, body #questsModal .bounty-modal-card, body #bou...`** — Styles matching UI elements.
### Css Blocks

- **L9400 `@media (max-width: 1200px)`** — Styles matching UI elements.
### Css Selectors

- **L9401 `body #questsModal .intro-modal-card.bounty-modal-card, body #bountyModal .intro-modal-card.bounty-modal-card, body #questsModal .bounty-modal-card, body #bou...`** — Styles matching UI elements.
- **L9411 `/* V10.3.1 widen dailies/bounties lightwindow by 50% */ #questsModal .intro-modal-card, #bountyModal .intro-modal-card`** — Styles matching UI elements.
- **L9419 `.burned-gold-raffle-display`** — Styles matching UI elements.
- **L9422 `.bounty-progress-row`** — Styles matching UI elements.
- **L9423 `.bounty-progress-copy`** — Styles matching UI elements.
- **L9424 `.bounty-progress-bar`** — Styles matching UI elements.
- **L9425 `.bounty-progress-bar-solid,.bounty-progress-bar-pending`** — Styles matching UI elements.
- **L9426 `.bounty-progress-bar-solid`** — Styles matching UI elements.
- **L9427 `.bounty-progress-bar-pending`** — Styles matching UI elements.
- **L9428 `.bounty-state-chip.is-pending-submission`** — Styles matching UI elements.
- **L9429 `.bounty-pending-note`** — Styles matching UI elements.
- **L9430 `.bounty-strip-copy-subtle`** — Styles matching UI elements.
- **L9433 `/* V10.5.1 dailies-bounties integrated modal sizing */ #questsModal .intro-modal-card, #bountyModal .intro-modal-card`** — Styles matching UI elements.
- **L9440 `#questsModal .intro-body, #bountyModal .intro-body`** — Styles matching UI elements.
- **L9445 `#questsModal .modal-top-toggle-btn, #bountyModal .modal-top-toggle-btn, #questsModal .bounty-card-title, #bountyModal .bounty-card-title, #questsModal .bount...`** — Styles matching UI elements.
- **L9479 `/* V10.5.2 quest/bounty modal click hardening */ #questsModal, #bountyModal`** — Styles matching UI elements.
- **L9487 `#questsModal .intro-modal-card, #bountyModal .intro-modal-card, #questsModal .intro-body, #bountyModal .intro-body, #questsModal button, #bountyModal button`** — Styles matching UI elements.
- **L9496 `body.intro-open #avaxTreasuryPanel, body.intro-open #treasuryFlyoutBackdrop`** — Styles matching UI elements.
- **L9502 `#rewardPayoutNoticeModal.reward-payout-notice-modal`** — Styles matching UI elements.
- **L9506 `#rewardPayoutNoticeModal.reward-payout-notice-modal .intro-modal-card`** — Styles matching UI elements.
- **L9511 `body.reward-payout-notice-open #questsModal, body.reward-payout-notice-open #bountyModal`** — Styles matching UI elements.
- **L9515 `body.reward-payout-notice-open #rewardPayoutNoticeModal`** — Styles matching UI elements.
- **L9518 `body.reward-payout-notice-open #rewardPayoutNoticeModal .intro-modal-card, body.reward-payout-notice-open #rewardPayoutNoticeModal button, body.reward-payout...`** — Styles matching UI elements.
- **L9525 `#questsModal .modal-top-toggle-btn.bounty-soon-toggle, #questsModal .modal-top-toggle-btn.bounty-soon-toggle:disabled`** — Styles matching UI elements.
- **L9534 `#questsModal .modal-top-toggle-btn.bounty-soon-toggle:hover, #questsModal .modal-top-toggle-btn.bounty-soon-toggle:focus-visible`** — Styles matching UI elements.
- **L9541 `/* v46.9.1.146 tap responsiveness + quest modal scroll hardening */ body.intro-open`** — Styles matching UI elements.
- **L9547 `button, .wallet-btn, .intro-toggle, .leaderboard-flyout-btn, .mobile-bottom-btn, .mobile-ability-btn, .bounty-claim-btn, .intro-close, .wallet-panel-toggle, ...`** — Styles matching UI elements.
- **L9563 `#questsModal, #bountyModal, #questsModal .intro-modal-card, #bountyModal .intro-modal-card, #questsModal .intro-body, #bountyModal .intro-body, #questsModal ...`** — Styles matching UI elements.
- **L9576 `#questsModal .intro-modal-card, #bountyModal .intro-modal-card`** — Styles matching UI elements.
- **L9581 `#questsModal .intro-body, #bountyModal .intro-body`** — Styles matching UI elements.
- **L9590 `#questsModal .bounty-claim-btn, #bountyModal .bounty-claim-btn, #questsModal button, #bountyModal button`** — Styles matching UI elements.
### Css Blocks

- **L9598 `@media (max-width: 1024px) and (orientation: landscape)`** — Styles matching UI elements.
### Css Selectors

- **L9599 `#questsModal, #bountyModal`** — Styles matching UI elements.
- **L9606 `#questsModal .intro-modal-card, #bountyModal .intro-modal-card`** — Styles matching UI elements.
- **L9614 `#questsModal .intro-body, #bountyModal .intro-body`** — Styles matching UI elements.
- **L9621 `#cancelActionBtn:not(:disabled), #mobileQuickCancelBtn.is-live`** — Styles matching UI elements.
- **L9626 `.tracked-run-replay-row`** — Styles matching UI elements.
- **L9627 `.tracked-run-replay-link,.tracked-run-replay-copy,.tracked-run-replay-stats`** — Styles matching UI elements.
- **L9628 `.tracked-run-replay-copy`** — Styles matching UI elements.
- **L9629 `.tracked-run-replay-stats`** — Styles matching UI elements.
- **L9630 `.tracked-run-replay-copy-small`** — Styles matching UI elements.
- **L9631 `.tracked-run-replay-url`** — Styles matching UI elements.
- **L9632 `.tracked-run-replay-url-missing`** — Styles matching UI elements.
- **L9635 `.replay-panel-body`** — Styles matching UI elements.
- **L9636 `.replay-panel-warning`** — Styles matching UI elements.
- **L9637 `.replay-panel-meta`** — Styles matching UI elements.
- **L9638 `.replay-panel-controls`** — Styles matching UI elements.
- **L9639 `.replay-panel-controls button`** — Styles matching UI elements.
- **L9640 `.replay-panel-step`** — Styles matching UI elements.
- **L9641 `.replay-panel-events`** — Styles matching UI elements.
- **L9642 `.replay-panel-events .card`** — Styles matching UI elements.
- **L9645 `.run-stats-modal-card`** — Styles matching UI elements.
- **L9646 `.run-stats-body`** — Styles matching UI elements.
- **L9647 `.run-stats-headline`** — Styles matching UI elements.
- **L9648 `.run-stats-meta-line`** — Styles matching UI elements.
- **L9649 `.run-stats-grid`** — Styles matching UI elements.
- **L9650 `.run-stats-kicker`** — Styles matching UI elements.
- **L9651 `.run-stats-value`** — Styles matching UI elements.
- **L9652 `.run-stats-section`** — Styles matching UI elements.
- **L9653 `.run-stats-chip-row`** — Styles matching UI elements.
- **L9654 `.run-stats-chip`** — Styles matching UI elements.
- **L9655 `.run-stats-empty`** — Styles matching UI elements.
- **L9656 `.run-stats-actions`** — Styles matching UI elements.
- **L9657 `.run-stats-copy-btn`** — Styles matching UI elements.
- **L9658 `.run-stats-copy-state`** — Styles matching UI elements.
- **L9659 `.is-replay-disabled`** — Styles matching UI elements.
### Css Blocks

- **L9660 `@media (max-width: 680px)`** — Styles matching UI elements.
### Css Selectors

- **L9662 `.run-stats-backdrop`** — Styles matching UI elements.
- **L9673 `.run-stats-backdrop.hidden`** — Styles matching UI elements.
- **L9674 `.run-stats-modal-card`** — Styles matching UI elements.
- **L9687 `/* Gen0 wallet hero bonus visuals */ .tile-gen0-hero`** — Styles matching UI elements.
- **L9701 `.tile-gen0-hero::before`** — Styles matching UI elements.
- **L9716 `.tile-gen0-hero::after`** — Styles matching UI elements.
- **L9729 `.tile-gen0-hero-portrait`** — Styles matching UI elements.
- **L9740 `.tile-gen0-sparkle`** — Styles matching UI elements.
- **L9752 `.tile-gen0-sparkle-1`** — Styles matching UI elements.
- **L9753 `.tile-gen0-sparkle-2`** — Styles matching UI elements.
- **L9754 `.tile-gen0-sparkle-3`** — Styles matching UI elements.
### Css Blocks

- **L9756 `@keyframes gen0AuraSpin`** — Styles matching UI elements.
### Css Selectors

- **L9758 `50%`** — Styles matching UI elements.
### Css Blocks

- **L9762 `@keyframes gen0GoldPulse`** — Styles matching UI elements.
- **L9767 `@keyframes gen0Sparkle`** — Styles matching UI elements.
### Css Selectors

- **L9768 `0%, 100%`** — Styles matching UI elements.
- **L9769 `45%`** — Styles matching UI elements.
- **L9770 `70%`** — Styles matching UI elements.
- **L9772 `/* Gen0 wallet hero bonus visuals */ .tile-gen0-hero`** — Styles matching UI elements.
- **L9783 `.tile-gen0-hero::before`** — Styles matching UI elements.
- **L9789 `.tile-gen0-sparkle`** — Styles matching UI elements.
- **L9799 `.tile-gen0-sparkle-1`** — Styles matching UI elements.
- **L9800 `.tile-gen0-sparkle-2`** — Styles matching UI elements.
- **L9801 `.tile-gen0-sparkle-3`** — Styles matching UI elements.
- **L9802 `.tile-gen0-sparkle-4`** — Styles matching UI elements.
- **L9803 `.tile-gen0-sparkle-5`** — Styles matching UI elements.
- **L9804 `.tile-gen0-sparkle-6`** — Styles matching UI elements.
- **L9805 `.tile-gen0-sparkle-7`** — Styles matching UI elements.
- **L9806 `.tile-gen0-sparkle-8`** — Styles matching UI elements.
- **L9807 `.tile-gen0-sparkle-9`** — Styles matching UI elements.
- **L9808 `.tile-gen0-sparkle-10`** — Styles matching UI elements.
### Css Blocks

- **L9810 `@keyframes gen0FallingSparkle`** — Styles matching UI elements.
### Css Selectors

- **L9811 `0%`** — Styles matching UI elements.
- **L9812 `12%`** — Styles matching UI elements.
- **L9813 `52%`** — Styles matching UI elements.
- **L9814 `100%`** — Styles matching UI elements.
### Css Blocks

- **L9816 `@keyframes gen0MetalSheen`** — Styles matching UI elements.
### Css Selectors

- **L9817 `0%, 100%`** — Styles matching UI elements.
- **L9818 `50%`** — Styles matching UI elements.
- **L9821 `/* v46.9.1.158: Wallet Heroes opens as a modal, while the left menu only shows the summary button. */ body.wallet-heroes-modal-open::after`** — Styles matching UI elements.
- **L9831 `.wallet-hero-panel .wallet-hero-panel-body`** — Styles matching UI elements.
- **L9834 `.wallet-hero-panel.modal-open .wallet-hero-panel-body`** — Styles matching UI elements.
- **L9853 `.wallet-hero-panel.modal-open .wallet-hero-bonus-header::before`** — Styles matching UI elements.
- **L9862 `.wallet-hero-panel.modal-open .wallet-hero-bonus-body`** — Styles matching UI elements.
- **L9867 `.wallet-hero-panel.modal-open .wallet-hero-slot-group`** — Styles matching UI elements.
- **L9870 `.wallet-hero-panel.modal-open .wallet-hero-card-list`** — Styles matching UI elements.
- **L9873 `.wallet-hero-panel.modal-open .wallet-hero-card`** — Styles matching UI elements.
### Css Blocks

- **L9876 `@media (max-width: 720px)`** — Styles matching UI elements.
### Css Selectors

- **L9877 `.wallet-hero-panel.modal-open .wallet-hero-panel-body`** — Styles matching UI elements.
- **L9882 `.wallet-hero-panel.modal-open .wallet-hero-card-list`** — Styles matching UI elements.
- **L9888 `/* v46.9.1.158: repair Wallet Heroes modal layering and How to Play click ownership. */ #walletHeroBonusSection.wallet-hero-panel.modal-open`** — Styles matching UI elements.
- **L9906 `#walletHeroBonusSection.wallet-hero-panel.modal-open > #walletHeroBonusToggle`** — Styles matching UI elements.
- **L9907 `#walletHeroBonusSection.wallet-hero-panel.modal-open #walletHeroBonusPanelBody`** — Styles matching UI elements.
- **L9921 `#walletHeroBonusSection.wallet-hero-panel.modal-open .wallet-hero-bonus-header`** — Styles matching UI elements.
- **L9928 `#walletHeroBonusSection.wallet-hero-panel.modal-open .wallet-hero-bonus-body`** — Styles matching UI elements.
- **L9933 `#walletHeroBonusSection.wallet-hero-panel:not(.modal-open) #walletHeroBonusPanelBody`** — Styles matching UI elements.
- **L9934 `body:not(.story-active) #storyOverlay.hidden`** — Styles matching UI elements.
- **L9936 `/* v46.9.1.161: show Gen0 buff details in the selected hero info panel. */ .selected-info-gen0-buff`** — Styles matching UI elements.
- **L9946 `.selected-info-gen0-buff strong`** — Styles matching UI elements.
- **L9953 `.selected-info-gen0-buff span`** — Styles matching UI elements.
- **L9960 `/* v46.9.1.163: visual Gen0 active run banner. */ .gen0-active-banner`** — Styles matching UI elements.
- **L9979 `.gen0-active-banner.hidden`** — Styles matching UI elements.
- **L9980 `.gen0-active-banner::before`** — Styles matching UI elements.
- **L9989 `.gen0-active-banner-title`** — Styles matching UI elements.
- **L9998 `.gen0-active-banner-classes`** — Styles matching UI elements.
- **L10007 `.gen0-active-banner-bonus`** — Styles matching UI elements.
### Css Blocks

- **L10016 `@keyframes gen0BannerSparkleFall`** — Styles matching UI elements.
### Css Selectors

- **L10017 `0%`** — Styles matching UI elements.
- **L10018 `100%`** — Styles matching UI elements.
### Css Blocks

- **L10020 `@keyframes gen0BannerSheen`** — Styles matching UI elements.
### Css Selectors

- **L10021 `0%, 40%`** — Styles matching UI elements.
- **L10022 `75%, 100%`** — Styles matching UI elements.
- **L10024 `.intro-gen0-guide-card`** — Styles matching UI elements.
### Css Blocks

- **L10028 `@media (max-width: 900px)`** — Styles matching UI elements.
### Css Selectors

- **L10029 `.gen0-active-banner`** — Styles matching UI elements.
- **L10035 `.gen0-active-banner-classes`** — Styles matching UI elements.
- **L10036 `.gen0-active-banner-bonus`** — Styles matching UI elements.
- **L10039 `/* v46.9.1.163: move Gen0 active status into the Wallet Heroes menu button. */ .wallet-hero-panel-toggle`** — Styles matching UI elements.
- **L10047 `#walletHeroBonusSection.has-gen0-active-banner:not(.modal-open) > #walletHeroBonusToggle`** — Styles matching UI elements.
- **L10052 `#walletHeroBonusToggle .wallet-panel-title-row`** — Styles matching UI elements.
- **L10056 `#walletHeroBonusToggle > .wallet-panel-chevron`** — Styles matching UI elements.
- **L10062 `#walletHeroBonusToggle .gen0-active-banner`** — Styles matching UI elements.
- **L10077 `#walletHeroBonusToggle .gen0-active-banner-title`** — Styles matching UI elements.
- **L10081 `#walletHeroBonusToggle .gen0-active-banner-classes`** — Styles matching UI elements.
- **L10087 `#walletHeroBonusToggle .gen0-active-banner-bonus`** — Styles matching UI elements.
- **L10093 `#walletHeroBonusSection.modal-open .gen0-active-banner`** — Styles matching UI elements.
- **L10097 `/* v46.9.1.165 - Gen0 hire button reinforcement */ .hire-button-card.hire-button-card-gen0`** — Styles matching UI elements.
- **L10105 `.hire-button-card.hire-button-card-gen0::after`** — Styles matching UI elements.
- **L10113 `.hire-button-card .hire-button-gen0`** — Styles matching UI elements.
- **L10122 `.hire-button-gen0-note`** — Styles matching UI elements.
### Css Blocks

- **L10133 `@keyframes gen0HireSheen`** — Styles matching UI elements.
### Css Selectors

- **L10134 `0%`** — Styles matching UI elements.
- **L10135 `18%`** — Styles matching UI elements.
- **L10136 `36%`** — Styles matching UI elements.
- **L10137 `100%`** — Styles matching UI elements.
- **L10145 `/* v46.9.1.173: restored How to Play with simple modal-owned focus. No wheel/touch rerouting. */ #seerIntroModal.how-to-play-active:not(.hidden)`** — Styles matching UI elements.
- **L10158 `#seerIntroModal.how-to-play-active:not(.hidden) .seer-intro-modal-card`** — Styles matching UI elements.
- **L10166 `#seerIntroModal.how-to-play-active:not(.hidden) .seer-intro-header, #seerIntroModal.how-to-play-active:not(.hidden) .seer-intro-footer`** — Styles matching UI elements.
- **L10170 `#seerIntroModal.how-to-play-active:not(.hidden) .seer-intro-body`** — Styles matching UI elements.
- **L10180 `body.how-to-play-open #grid, body.how-to-play-open .grid, body.how-to-play-open .center-panel`** — Styles matching UI elements.
- **L10186 `/* HONK daily quest reward toggle */ .daily-reward-toggle-wrap`** — Styles matching UI elements.
- **L10199 `.daily-reward-toggle-label`** — Styles matching UI elements.
- **L10206 `.daily-reward-toggle`** — Styles matching UI elements.
- **L10214 `.daily-reward-toggle-btn`** — Styles matching UI elements.
- **L10223 `.daily-reward-toggle-btn.is-active`** — Styles matching UI elements.
- **L10228 `.daily-reward-toggle-note`** — Styles matching UI elements.
### Css Blocks

- **L10234 `@media (max-width: 700px)`** — Styles matching UI elements.
### Css Selectors

- **L10235 `.daily-reward-toggle-note`** — Styles matching UI elements.
- **L10238 `/* Compact daily rewards header: keep the accessible title hidden, show only the kicker. */ .sr-only`** — Styles matching UI elements.
- **L10250 `.quests-modal-header`** — Styles matching UI elements.
- **L10254 `.quests-modal-header .intro-kicker`** — Styles matching UI elements.
- **L10258 `.bounty-hero-strip-with-toggle`** — Styles matching UI elements.
- **L10262 `.bounty-strip-actions`** — Styles matching UI elements.
- **L10269 `.bounty-hero-strip-with-toggle .daily-reward-toggle-wrap`** — Styles matching UI elements.
- **L10276 `.bounty-hero-strip-with-toggle .daily-reward-toggle-label`** — Styles matching UI elements.
### Css Blocks

- **L10280 `@media (max-width: 760px)`** — Styles matching UI elements.
### Css Selectors

- **L10281 `.bounty-strip-actions`** — Styles matching UI elements.
- **L10284 `/* v46.9.1.183: show Blinding Light Totem waves remaining on its tile */ .tile-totem-waves-badge`** — Styles matching UI elements.
- **L10293 `.tile-has-slow-totem .tile-totem-waves-badge .tile-shadow-waves-count`** — Styles matching UI elements.
- **L10298 `/* Right-panel ability accordion */ .ability-row`** — Styles matching UI elements.
- **L10302 `.ability-row-details`** — Styles matching UI elements.
- **L10313 `.ability-row-details.hidden, .passive-card-body.hidden`** — Styles matching UI elements.
- **L10317 `.passive-card-header`** — Styles matching UI elements.
- **L10330 `.passive-card-header .passive-name`** — Styles matching UI elements.
- **L10333 `.passive-card-caret`** — Styles matching UI elements.
- **L10339 `.passive-card.open .passive-card-caret`** — Styles matching UI elements.
- **L10342 `.passive-card-body`** — Styles matching UI elements.
- **L10345 `.passive-card-body p`** — Styles matching UI elements.
- **L10350 `/* v46.9.1.206: targeted desktop bottom HUD/hire layout tweaks */ #skipSetupBtn`** — Styles matching UI elements.
### Css Blocks

- **L10355 `@media (min-width: 1025px)`** — Styles matching UI elements.
### Css Selectors

- **L10356 `.bottom-panel .controls-row.action-row, .bottom-panel .controls-row.action-row.controls-row-lean`** — Styles matching UI elements.
- **L10362 `.bottom-panel #restartBtn`** — Styles matching UI elements.
- **L10368 `.bottom-panel .footer-topbar .hud-pill`** — Styles matching UI elements.
- **L10372 `.bottom-panel .hire-list`** — Styles matching UI elements.
- **L10376 `.bottom-panel .hire-list > *`** — Styles matching UI elements.
- **L10381 `.bottom-panel .hire-list > .hire-button-card-gen0`** — Styles matching UI elements.
- **L10385 `.bottom-panel .hire-list > :nth-child(1), .bottom-panel .hire-list > :nth-child(2), .bottom-panel .hire-list > :nth-child(3), .bottom-panel .hire-list > :nth...`** — Styles matching UI elements.
- **L10393 `.bottom-panel .hire-list > .hire-button-card-gen0`** — Styles matching UI elements.
- **L10399 `/* v46.9.1.209: GEN0 hire note above button + restored start-wave-hint sizing */ .start-wave-hint`** — Styles matching UI elements.
- **L10407 `.bottom-panel .hire-button-card-gen0`** — Styles matching UI elements.
- **L10413 `.bottom-panel .hire-button-card-gen0 .hire-button-gen0-note`** — Styles matching UI elements.
- **L10422 `.bottom-panel .hire-button-card-gen0 .hire-button-gen0`** — Styles matching UI elements.
- **L10427 `/* v46.9.1.210: fix hire button alignment */ .bottom-panel .hire-button-card`** — Styles matching UI elements.
- **L10434 `.bottom-panel .hire-button-card-gen0`** — Styles matching UI elements.
- **L10440 `.bottom-panel .hire-button-card .hire-button, .bottom-panel .hire-button-card-gen0 .hire-button-gen0`** — Styles matching UI elements.
- **L10448 `.bottom-panel .hire-button-card-gen0 .hire-button-gen0-note`** — Styles matching UI elements.
- **L10455 `/* v46.9.1.211: Monk Sacrifice relic visuals */ .tile-sacrifice-monk::before, .tile-sacrifice-monk::after`** — Styles matching UI elements.
- **L10467 `.tile-sacrifice-monk::before`** — Styles matching UI elements.
- **L10468 `.tile-sacrifice-monk::after`** — Styles matching UI elements.
- **L10469 `.tile-sacrifice-monk .tile-hero-portrait`** — Styles matching UI elements.
- **L10474 `.tile-sacrifice-label`** — Styles matching UI elements.

