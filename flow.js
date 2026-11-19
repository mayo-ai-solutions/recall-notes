"use strict";
/* Recall v2 features that sit on top of the core: journal, follow-ups, check-in threads, coach, filters.
   Stage 2 ships only the hook the voice button needs; later stages add the rest. */

function journalOpts(){return {type:"journal",typeLocked:true,journalDate:RM.dateKey(Date.now())}}

/* The Settings "Your data" section loads its snapshot row after it renders. */
const _renderSettings=renderSettings;
renderSettings=function(){_renderSettings();paintSnapshot()};
