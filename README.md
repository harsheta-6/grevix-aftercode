<h3>Gevix Aftercode 2026</h3>

<h4>Idea</h4>
A road maintenance triage tool that turns ordinary phone or dashcam video into a ranked repair plan.
<br/>
<b>Process</b>
<p>Engineer uploads short clips of damaged roads and enter a fixed budget. <span><b>----></b></span>  AI vision rates the condition of each segment and flags the likely root cause. <span><b> ----> </b><span> Transparent prioritization model then picks which segment to fix first using the most benefit per cost until budget runs out. <br/>
<span><b>output:</b></span> <br/>
1. Ranked work list. <br/>
2. Map of priority segment <br/>
3. One page work order a contractor can work on
</p>

<h4>Why its needed </h4>
<p>
Local road authorities have limited maintenance budgets and far more damaged roads than they can fix. Condition surveys are slow and expensive, so decisions are often made by guesswork or complaints. Worse, surface repairs often fail within a season because the real cause, usually water that isn’t draining, was never addressed. Resurfacing a road with a blocked drain wastes money.
</p>

<h4>Who it's for</h4>
<p>
Municipal and rural road engineers and maintenance officiers. Contractors and citizens are secondary users.
</p>

<h4>What makes it different</h4>
<p>
Most tools appraise one road. This allocates a fixed budget across a network, and its ranking logic is rule-based and visible rather than a black-box AI score. Its diagnostic rules put drainage fixes before resurfacing. Costs are based on Indian public works schedules of rates.
</p>

<h4>Approach to the problem</h4>
<p>
<span><b>Initialization:</b></span> deciding the stack for frontend and backend. A vision model API for frame analysis and Leaflet for the map.
<br/>
<span><b>Modelling:</b></span> Video can be uploaded and frame extraction is done every few seconds. A vision prompt that returns structured JSON which includes - damage type, severity, suspected cause, confidence.
<br/>
<span><b>Costing:</b></span> Make diagonostic rules files and budget allocation logic, with benefit per cost, cost per segment, and a cutoff when the money runs out.
<br/>
<span><b>Output:</b></span> Map view, ranked list, and the one page work order
<br/>
</p>

<h2>_______________</h2>

<h4>Challenge 1:</h4>
<p>
<span><b>Card Says:</b></span> a wrong dashcam clock corrupts segmentation and ranking. 
<br/><br/>
<span><b>My Tool:</b></span> The clock inherently can not corrupt the result because frames are sampled by position in the video and the repair ranking comes from what the AI sees on the road. Dates matter only for ordering clips, judging how fresh a survey is and the reserved cost-of-waiting feature. To handle area that are affected, <span><b>I built a trust layer that protects those uses without touching the core pipeline</b></span><br/>
<br/>
<span><b>What was built to adapt to the challenge:</b></span><br/>
A timestamp validator that gathers independent evidence, decides whether the recording date can be trusted, and labels each clip with one of three states:<br/>
<span><b>Verified:</b></span> the date is plausible and nothing contradicts it.<br/>
<span><b>Corrected:</b></span> an engineer-entered date (or a clock error learned from one on the same upload batch) replaced a bad camera date. The original is kept.<br/>
<span><b>Unverified:</b></span> the evidence is missing or contradictory, so no date is invented. We only record the latest the clip could have been made.
</p>
<h5>Workflow</h5>
<p>
1. The video is uploaded as normal and is never rejected over its timestamp. <br/> 2. Frames are sampled and analyzed visually, independent of any calendar date. <br/> 3. Evidence is collected: embedded metadata, filename, file-modified time, upload time, and any date the engineer entered. <br/> 4. Plausibility and contradiction checks run (future dates, reset clocks, a clip dated after its file, conflicts with the entered date). <br/> 5. The date is marked verified, corrected, or unverified. <br/> 6. Only verified or corrected dates feed ordering, freshness, and cost-of-waiting. <br/> 7. Ranking continues on road condition alone. A severe road with an unverified date gets a re-check flag, not a demotion.
</p>
<h5>Architecture</h5>
<img width="1344" height="584" alt="Screenshot 2026-10-11 101311" src="https://github.com/user-attachments/assets/af250862-8307-4570-8e1c-e5b4f0b36331" />
