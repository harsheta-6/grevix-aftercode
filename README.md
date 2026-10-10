<h3>Gevix Aftercode 2026</h3>

<br/>
<h4>Idea</h4>
A road maintenance triage tool that turns ordinary phone or dashcam video into a ranked repair plan.

<b>Process</b>
<p>Engineer uploads short clips of damaged roads and enter a fixed budget. <span><b>----></b></span>  AI vision rates the condition of each segment and flags the likely root cause. <span><b> ----> </b><span> Transparent prioritization model then picks which segment to fix first using the most benefit per cost until budget runs out
<span><b>output:</b></span> <br/>
1. Ranked work list. <br/>
2. Map of priority segment <br/>
3. One page work order a contractor can work on
</p>
<br/>
<h4>Why its needed </h4>
<p>
Local road authorities have limited maintenance budgets and far more damaged roads than they can fix. Condition surveys are slow and expensive, so decisions are often made by guesswork or complaints. Worse, surface repairs often fail within a season because the real cause, usually water that isn’t draining, was never addressed. Resurfacing a road with a blocked drain wastes money.
</p>
<br/>
<h4>Who it's for</h4>
<p>
Municipal and rural road engineers and maintenance officiers. Contractors and citizens are secondary users.
</p>

<br/>

<h4>What makes it different</h4>
<p>
Most tools appraise one road. This allocates a fixed budget across a network, and its ranking logic is rule-based and visible rather than a black-box AI score. Its diagnostic rules put drainage fixes before resurfacing. Costs are based on Indian public works schedules of rates.
</p>

<br/>

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