import React from 'react';

interface SceneDiagramProps {
  type: string;
  title: string;
}

export function SceneDiagram({ type, title }: SceneDiagramProps) {
  switch (type) {
    case 'coil_receiving':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Bay Crane Gantry */}
          <line
            x1="20"
            y1="30"
            x2="580"
            y2="30"
            stroke="#64748b"
            strokeWidth="4"
          />
          <line
            x1="20"
            y1="20"
            x2="580"
            y2="20"
            stroke="#475569"
            strokeWidth="2"
            strokeDasharray="8,4"
          />
          <rect x="250" y="24" width="70" height="18" fill="#e2e8f0" rx="3" />
          <text x="260" y="37" fill="#0f172a" fontSize="10" fontWeight="bold">
            CRANE 40T
          </text>
          <line
            x1="285"
            y1="42"
            x2="285"
            y2="80"
            stroke="#94a3b8"
            strokeWidth="2.5"
          />
          {/* C-Hook */}
          <path
            d="M 285 80 L 285 105 L 340 105 L 340 135"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Steel Coil on Saddle */}
          <ellipse
            cx="380"
            cy="140"
            rx="65"
            ry="65"
            fill="#475569"
            stroke="#94a3b8"
            strokeWidth="3"
          />
          <ellipse
            cx="380"
            cy="140"
            rx="30"
            ry="30"
            fill="#0f172a"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          {/* Coil wraps */}
          <circle
            cx="380"
            cy="140"
            r="48"
            fill="none"
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="5,3"
          />

          {/* Low stress hard stamp */}
          <rect
            x="350"
            y="130"
            width="60"
            height="20"
            rx="2"
            fill="#1e293b"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          <text
            x="354"
            y="144"
            fill="#38bdf8"
            fontSize="8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            HEAT-9842
          </text>

          {/* Saddle / Car */}
          <polygon
            points="310,205 450,205 440,185 320,185"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="2"
          />
          <line
            x1="50"
            y1="205"
            x2="550"
            y2="205"
            stroke="#475569"
            strokeWidth="3"
          />

          {/* Operator with Scanner */}
          <circle
            cx="160"
            cy="130"
            r="14"
            fill="#fbbf24"
            stroke="#d97706"
            strokeWidth="2"
          />
          <rect x="145" y="146" width="30" height="42" rx="4" fill="#2563eb" />
          <rect x="175" y="148" width="18" height="8" rx="2" fill="#ef4444" />
          {/* Scan laser beam */}
          <line
            x1="193"
            y1="152"
            x2="350"
            y2="140"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="3,2"
          />

          {/* Callouts */}
          <text x="140" y="110" fill="#e2e8f0" fontSize="10" fontWeight="bold">
            Operator Verification
          </text>
          <text x="350" y="75" fill="#38bdf8" fontSize="11" fontWeight="bold">
            Coil ID & 3-Point UT Gauge
          </text>
        </svg>
      );

    case 'strip_prep':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Decoiler */}
          <circle
            cx="80"
            cy="120"
            r="45"
            fill="#475569"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <circle cx="80" cy="120" r="18" fill="#1e293b" />
          <text x="55" y="185" fill="#cbd5e1" fontSize="10" fontWeight="bold">
            Decoiler Car
          </text>

          {/* Strip moving through leveler */}
          <path
            d="M 80 75 Q 140 105 180 115 L 420 115"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="8"
          />

          {/* 9-Roll Flattener Rolls (Top 4, Bottom 5) */}
          {[200, 240, 280, 320].map((cx) => (
            <circle
              key={`top-${cx}`}
              cx={cx}
              cy="95"
              r="14"
              fill="#334155"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          ))}
          {[180, 220, 260, 300, 340].map((cx) => (
            <circle
              key={`bot-${cx}`}
              cx={cx}
              cy="135"
              r="14"
              fill="#334155"
              stroke="#f59e0b"
              strokeWidth="2"
            />
          ))}
          <text x="210" y="65" fill="#f59e0b" fontSize="11" fontWeight="bold">
            9-Roll Hydraulic Flattener (185 bar)
          </text>

          {/* Rotary Edge Milling Station */}
          <rect
            x="400"
            y="75"
            width="45"
            height="80"
            rx="4"
            fill="#1e293b"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <circle cx="422" cy="100" r="12" fill="#ef4444" />
          <circle cx="422" cy="130" r="12" fill="#ef4444" />
          <text x="375" y="175" fill="#38bdf8" fontSize="10" fontWeight="bold">
            Rotary Edge Milling
          </text>

          {/* Milled Double-V Bevel Zoom Inset */}
          <rect
            x="470"
            y="40"
            width="115"
            height="150"
            rx="6"
            fill="#0f172a"
            stroke="#64748b"
            strokeWidth="1.5"
          />
          <text x="480" y="60" fill="#38bdf8" fontSize="10" fontWeight="bold">
            Double-V Joint:
          </text>
          {/* Bevel profile */}
          <path
            d="M 485 85 L 520 85 L 535 110 L 535 125 L 520 150 L 485 150"
            fill="#334155"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <text x="540" y="118" fill="#e2e8f0" fontSize="9">
            Root: 1.5mm
          </text>
          <text x="500" y="175" fill="#f59e0b" fontSize="9">
            Bevel: 30° ± 2°
          </text>
        </svg>
      );

    case 'helical_forming':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Pipe Cylinder */}
          <rect
            x="260"
            y="60"
            width="310"
            height="130"
            rx="6"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="2"
          />
          {/* Helical Seam Lines */}
          <path
            d="M 290 60 L 330 190 M 360 60 L 400 190 M 430 60 L 470 190 M 500 60 L 540 190"
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeDasharray="4,2"
          />

          {/* Forming Rolls Head */}
          <circle
            cx="250"
            cy="50"
            r="18"
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          <circle
            cx="250"
            cy="200"
            r="18"
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          <circle
            cx="220"
            cy="125"
            r="20"
            fill="#1e293b"
            stroke="#38bdf8"
            strokeWidth="3"
          />
          <text x="180" y="95" fill="#38bdf8" fontSize="10" fontWeight="bold">
            Bending Roll
          </text>

          {/* Incoming Strip at forming angle */}
          <g transform="translate(220, 125) rotate(-24)">
            <rect
              x="-190"
              y="-30"
              width="190"
              height="60"
              fill="#64748b"
              stroke="#cbd5e1"
              strokeWidth="2"
            />
            <line
              x1="-190"
              y1="0"
              x2="0"
              y2="0"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4,2"
            />
            <text
              x="-160"
              y="-38"
              fill="#e2e8f0"
              fontSize="10"
              fontWeight="bold"
            >
              Strip Width (W)
            </text>
          </g>

          {/* Angle Indicator */}
          <path
            d="M 140 125 A 70 70 0 0 0 160 85"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          <text x="80" y="90" fill="#f59e0b" fontSize="11" fontWeight="bold">
            Forming Angle α
          </text>
          <text x="360" y="45" fill="#38bdf8" fontSize="11" fontWeight="bold">
            Spiral Seam Gap (0.6 - 1.2 mm)
          </text>
        </svg>
      );

    case 'submerged_arc_welding':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Base Steel Plates */}
          <rect
            x="50"
            y="150"
            width="230"
            height="40"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="2"
          />
          <rect
            x="320"
            y="150"
            width="230"
            height="40"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* Granular Flux Blanket */}
          <ellipse
            cx="300"
            cy="140"
            rx="90"
            ry="35"
            fill="#78716c"
            opacity="0.85"
          />
          <text x="250" y="125" fill="#e2e8f0" fontSize="10" fontWeight="bold">
            Granular Flux Blanket
          </text>

          {/* Flux Hopper & Vacuum Shoe */}
          <polygon
            points="270,30 330,30 315,80 285,80"
            fill="#1e293b"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <text x="275" y="24" fill="#38bdf8" fontSize="9" fontWeight="bold">
            Flux Hopper
          </text>

          {/* SAW Electrodes (Lead DC+ and Trail AC) */}
          <line
            x1="285"
            y1="80"
            x2="292"
            y2="145"
            stroke="#f59e0b"
            strokeWidth="4"
          />
          <line
            x1="315"
            y1="80"
            x2="308"
            y2="145"
            stroke="#f59e0b"
            strokeWidth="3"
          />
          {/* Molten Weld Pool / Submerged Arc */}
          <ellipse cx="300" cy="155" rx="28" ry="16" fill="#ef4444" />
          <ellipse cx="300" cy="155" rx="14" ry="8" fill="#fef08a" />

          {/* Solidified Weld Bead */}
          <path
            d="M 280 150 Q 300 142 320 150 L 320 170 Q 300 175 280 170 Z"
            fill="#94a3b8"
          />

          {/* Vacuum Recovery Line */}
          <rect
            x="390"
            y="60"
            width="40"
            height="75"
            rx="4"
            fill="#1e293b"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
          <line
            x1="410"
            y1="135"
            x2="350"
            y2="145"
            stroke="#38bdf8"
            strokeWidth="3"
            strokeDasharray="3,2"
          />
          <text x="440" y="100" fill="#38bdf8" fontSize="10" fontWeight="bold">
            Vacuum Recovery
          </text>
        </svg>
      );

    case 'quality_testing':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Hydrostatic Test Bench Clamps */}
          <rect
            x="40"
            y="60"
            width="30"
            height="120"
            rx="4"
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <rect
            x="530"
            y="60"
            width="30"
            height="120"
            rx="4"
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="2"
          />

          {/* Clamped Pipe Body */}
          <rect
            x="70"
            y="75"
            width="460"
            height="90"
            rx="4"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* Spiral Weld Line with UT Probe */}
          <path
            d="M 120 75 L 160 165 M 220 75 L 260 165 M 320 75 L 360 165"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />

          {/* Phased Array UT Scanner Gantry */}
          <rect
            x="225"
            y="45"
            width="70"
            height="25"
            rx="4"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <line
            x1="260"
            y1="70"
            x2="260"
            y2="90"
            stroke="#38bdf8"
            strokeWidth="3"
          />
          <text x="232" y="61" fill="#38bdf8" fontSize="9" fontWeight="bold">
            PA-UT PROBE
          </text>

          {/* Pressure Gauge Inset */}
          <circle
            cx="100"
            cy="185"
            r="30"
            fill="#0f172a"
            stroke="#22c55e"
            strokeWidth="2.5"
          />
          <line
            x1="100"
            y1="185"
            x2="115"
            y2="170"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <text x="85" y="190" fill="#22c55e" fontSize="9" fontWeight="bold">
            145 BAR
          </text>
          <text x="60" y="225" fill="#e2e8f0" fontSize="10" fontWeight="bold">
            Hydro Proof Hold: 10s
          </text>

          {/* Digital Monitor */}
          <rect
            x="390"
            y="30"
            width="130"
            height="38"
            rx="4"
            fill="#020617"
            stroke="#22c55e"
            strokeWidth="1.5"
          />
          <text
            x="400"
            y="48"
            fill="#22c55e"
            fontSize="9"
            fontFamily="monospace"
          >
            PRESSURE: 145.0 BAR
          </text>
          <text
            x="400"
            y="60"
            fill="#38bdf8"
            fontSize="9"
            fontFamily="monospace"
          >
            UT SEAM: 100% PASS
          </text>
        </svg>
      );

    case 'release_dispatch':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Finished Coated Pipe (Green 3LPE) */}
          <rect
            x="60"
            y="70"
            width="480"
            height="100"
            rx="8"
            fill="#15803d"
            stroke="#22c55e"
            strokeWidth="3"
          />
          <text x="80" y="95" fill="#bbf7d0" fontSize="10" fontWeight="bold">
            3-Layer Polyethylene (3LPE) Anti-Corrosion Coating
          </text>

          {/* Precision End Bevel (Silver cut face) */}
          <polygon
            points="540,70 540,170 530,170 530,70"
            fill="#cbd5e1"
            stroke="#94a3b8"
          />
          <text x="460" y="195" fill="#cbd5e1" fontSize="10" fontWeight="bold">
            Bevel: 30° Land: 1.6mm
          </text>

          {/* Stenciled Pedigree Info */}
          <rect
            x="80"
            y="115"
            width="400"
            height="35"
            rx="3"
            fill="#052e16"
            stroke="#4ade80"
            strokeWidth="1"
          />
          <text
            x="90"
            y="130"
            fill="#ffffff"
            fontSize="9"
            fontFamily="monospace"
            fontWeight="bold"
          >
            WELSPUN CORP · 48&quot; X 0.562&quot; · API 5L X70M PSL2
          </text>
          <text
            x="90"
            y="142"
            fill="#fef08a"
            fontSize="8"
            fontFamily="monospace"
          >
            HEAT: 9842 · PIPE: 1042 · NDT 100% OK · 25kV PASS
          </text>

          {/* QA Passed Hologram / Stamp */}
          <circle
            cx="500"
            cy="132"
            r="18"
            fill="#eab308"
            stroke="#ca8a04"
            strokeWidth="2"
          />
          <text x="488" y="136" fill="#0f172a" fontSize="8" fontWeight="bold">
            QA PASS
          </text>
        </svg>
      );

    case 'ppe_safety':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Turnstile / Plant Entry Floor */}
          <rect x="50" y="200" width="500" height="20" fill="#eab308" />
          <text x="180" y="214" fill="#0f172a" fontSize="10" fontWeight="bold">
            MANDATORY PPE ENFORCEMENT ZONE
          </text>

          {/* Operator Figure */}
          {/* Hard Hat */}
          <ellipse
            cx="300"
            cy="55"
            rx="25"
            ry="12"
            fill="#f59e0b"
            stroke="#d97706"
            strokeWidth="2"
          />
          {/* Safety Glasses */}
          <rect x="288" y="66" width="24" height="8" rx="2" fill="#38bdf8" />
          {/* Ear Defenders */}
          <circle cx="272" cy="72" r="8" fill="#ef4444" />
          <circle cx="328" cy="72" r="8" fill="#ef4444" />
          {/* Head */}
          <circle cx="300" cy="72" r="18" fill="#fed7aa" />
          {/* High-Vis Vest */}
          <polygon
            points="265,95 335,95 345,170 255,170"
            fill="#eab308"
            stroke="#ca8a04"
            strokeWidth="2"
          />
          {/* Reflective Stripes */}
          <line
            x1="270"
            y1="120"
            x2="330"
            y2="120"
            stroke="#ffffff"
            strokeWidth="6"
          />
          <line
            x1="265"
            y1="150"
            x2="335"
            y2="150"
            stroke="#ffffff"
            strokeWidth="6"
          />
          {/* Steel-Toe Boots */}
          <rect x="260" y="170" width="28" height="30" rx="3" fill="#1e293b" />
          <rect x="312" y="170" width="28" height="30" rx="3" fill="#1e293b" />

          {/* Callout Badges */}
          <rect
            x="60"
            y="45"
            width="130"
            height="28"
            rx="4"
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="1.5"
          />
          <text x="70" y="63" fill="#fef08a" fontSize="10" fontWeight="bold">
            Hard Hat + Ear Muffs
          </text>
          <line
            x1="190"
            y1="58"
            x2="270"
            y2="60"
            stroke="#f59e0b"
            strokeDasharray="3,2"
          />

          <rect
            x="410"
            y="100"
            width="140"
            height="28"
            rx="4"
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="1.5"
          />
          <text x="420" y="118" fill="#fef08a" fontSize="10" fontWeight="bold">
            High-Vis Reflective Vest
          </text>
          <line
            x1="410"
            y1="114"
            x2="340"
            y2="125"
            stroke="#f59e0b"
            strokeDasharray="3,2"
          />

          <rect
            x="60"
            y="155"
            width="140"
            height="28"
            rx="4"
            fill="#1e293b"
            stroke="#f59e0b"
            strokeWidth="1.5"
          />
          <text x="70" y="173" fill="#fef08a" fontSize="10" fontWeight="bold">
            Metatarsal Steel Boots
          </text>
          <line
            x1="200"
            y1="170"
            x2="260"
            y2="185"
            stroke="#f59e0b"
            strokeDasharray="3,2"
          />
        </svg>
      );

    case 'hazard_loads':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Crane Hook & Heavy Coil */}
          <rect x="270" y="20" width="60" height="20" fill="#e2e8f0" rx="3" />
          <line
            x1="300"
            y1="40"
            x2="300"
            y2="85"
            stroke="#94a3b8"
            strokeWidth="4"
          />
          <circle
            cx="300"
            cy="115"
            r="35"
            fill="#475569"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <circle cx="300" cy="115" r="15" fill="#0f172a" />

          {/* Red Danger Cone: Line of Fire */}
          <polygon
            points="300,120 180,210 420,210"
            fill="#ef4444"
            opacity="0.25"
          />
          <line
            x1="300"
            y1="120"
            x2="180"
            y2="210"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
          <line
            x1="300"
            y1="120"
            x2="420"
            y2="210"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4,2"
          />

          <text x="245" y="180" fill="#f87171" fontSize="12" fontWeight="bold">
            LINE OF FIRE DROP CONE
          </text>
          <text x="255" y="195" fill="#fca5a5" fontSize="9">
            NO ENTRY WHILE HOISTING
          </text>

          {/* Operator in Safe Zone */}
          <circle cx="100" cy="165" r="10" fill="#22c55e" />
          <rect x="92" y="177" width="16" height="25" fill="#22c55e" rx="2" />
          <text x="65" y="150" fill="#4ade80" fontSize="10" fontWeight="bold">
            SAFE STANDING ZONE
          </text>
        </svg>
      );

    case 'loto_isolation':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Main Power Disconnect Switch Panel */}
          <rect
            x="70"
            y="40"
            width="160"
            height="160"
            rx="8"
            fill="#1e293b"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <text x="90" y="65" fill="#cbd5e1" fontSize="10" fontWeight="bold">
            MAIN DISCONNECT
          </text>

          {/* Rotary Switch Handle Locked in OFF */}
          <circle
            cx="150"
            cy="115"
            r="30"
            fill="#0f172a"
            stroke="#64748b"
            strokeWidth="2"
          />
          <line
            x1="150"
            y1="115"
            x2="125"
            y2="115"
            stroke="#ef4444"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <text x="95" y="118" fill="#ef4444" fontSize="10" fontWeight="bold">
            OFF
          </text>

          {/* Red Safety Padlock */}
          <rect
            x="175"
            y="115"
            width="30"
            height="32"
            rx="4"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="2"
          />
          <path
            d="M 183 115 L 183 100 A 7 7 0 0 1 197 100 L 197 115"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="3"
          />
          <circle cx="190" cy="130" r="3" fill="#fef08a" />

          {/* Danger Tag */}
          <rect
            x="220"
            y="110"
            width="70"
            height="90"
            rx="3"
            fill="#ffffff"
            stroke="#dc2626"
            strokeWidth="2"
          />
          <rect x="225" y="115" width="60" height="20" fill="#dc2626" />
          <text x="232" y="128" fill="#ffffff" fontSize="9" fontWeight="bold">
            DANGER
          </text>
          <text x="228" y="145" fill="#0f172a" fontSize="7" fontWeight="bold">
            DO NOT OPERATE
          </text>
          <text x="228" y="160" fill="#0f172a" fontSize="7">
            WORKER: R. SHARMA
          </text>

          {/* Hydraulic Pressure Bleed Gauge */}
          <circle
            cx="430"
            cy="120"
            r="45"
            fill="#0f172a"
            stroke="#22c55e"
            strokeWidth="3"
          />
          <line
            x1="430"
            y1="120"
            x2="430"
            y2="85"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x="405" y="125" fill="#22c55e" fontSize="14" fontWeight="bold">
            0 BAR
          </text>
          <text x="365" y="185" fill="#4ade80" fontSize="11" fontWeight="bold">
            Zero Energy Verified
          </text>
        </svg>
      );

    case 'near_miss':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Hydraulic Pipe Leak */}
          <line
            x1="60"
            y1="70"
            x2="260"
            y2="70"
            stroke="#64748b"
            strokeWidth="8"
          />
          {/* Drips */}
          <circle cx="180" cy="95" r="4" fill="#f59e0b" />
          <circle cx="180" cy="115" r="4" fill="#f59e0b" />
          {/* Puddle */}
          <ellipse
            cx="180"
            cy="175"
            rx="55"
            ry="15"
            fill="#f59e0b"
            opacity="0.5"
          />

          {/* Warning Safety Cone Placed */}
          <polygon
            points="120,185 140,185 130,140"
            fill="#f97316"
            stroke="#c2410c"
            strokeWidth="1"
          />
          <text x="95" y="205" fill="#fed7aa" fontSize="9" fontWeight="bold">
            Hazard Barricaded
          </text>

          {/* Digital Near Miss Terminal */}
          <rect
            x="360"
            y="45"
            width="180"
            height="140"
            rx="8"
            fill="#1e293b"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <rect x="375" y="60" width="150" height="25" rx="3" fill="#0284c7" />
          <text x="390" y="77" fill="#ffffff" fontSize="10" fontWeight="bold">
            NEAR-MISS LOGGED
          </text>
          <text x="380" y="110" fill="#94a3b8" fontSize="9">
            Location: Mill 1 Conveyor
          </text>
          <text x="380" y="125" fill="#94a3b8" fontSize="9">
            Hazard: Hydraulic fluid leak
          </text>
          <text x="380" y="145" fill="#4ade80" fontSize="9" fontWeight="bold">
            STATUS: Work Order #4081 Dispatched
          </text>
        </svg>
      );

    case 'inspection_gates':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Conveyor Line */}
          <line
            x1="40"
            y1="120"
            x2="560"
            y2="120"
            stroke="#475569"
            strokeWidth="4"
          />

          {/* 4 Quality Gates */}
          {[
            { x: 90, label: 'Q1: Raw Coil', color: '#38bdf8' },
            { x: 220, label: 'Q2: Milled Edge', color: '#f59e0b' },
            { x: 350, label: 'Q3: SAW Weld', color: '#ef4444' },
            { x: 480, label: 'Q4: Hydro / UT', color: '#22c55e' },
          ].map((g, i) => (
            <g key={g.x}>
              <circle
                cx={g.x}
                cy="120"
                r="24"
                fill="#1e293b"
                stroke={g.color}
                strokeWidth="3"
              />
              <text
                x={g.x - 6}
                y="125"
                fill="#ffffff"
                fontSize="12"
                fontWeight="bold"
              >
                {i + 1}
              </text>
              <rect
                x={g.x - 45}
                y="155"
                width="90"
                height="30"
                rx="4"
                fill="#0f172a"
                stroke="#64748b"
                strokeWidth="1"
              />
              <text
                x={g.x - 38}
                y="174"
                fill={g.color}
                fontSize="9"
                fontWeight="bold"
              >
                {g.label}
              </text>
            </g>
          ))}

          {/* Flow Arrows */}
          <polygon points="160,115 170,120 160,125" fill="#94a3b8" />
          <polygon points="290,115 300,120 290,125" fill="#94a3b8" />
          <polygon points="420,115 430,120 420,125" fill="#94a3b8" />

          <text x="180" y="60" fill="#e2e8f0" fontSize="12" fontWeight="bold">
            API 5L Multi-Gate Quality Assurance System
          </text>
        </svg>
      );

    case 'defect_types':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Card 1: Undercut */}
          <g transform="translate(40, 45)">
            <rect
              width="150"
              height="150"
              rx="6"
              fill="#1e293b"
              stroke="#ef4444"
              strokeWidth="2"
            />
            <text x="15" y="25" fill="#f87171" fontSize="11" fontWeight="bold">
              Weld Undercut (&gt;0.5mm)
            </text>
            <path
              d="M 20 100 L 60 100 Q 65 118 75 100 L 130 100"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="4"
            />
            <text x="15" y="135" fill="#94a3b8" fontSize="8">
              Sharp groove at weld toe
            </text>
            <text x="15" y="148" fill="#ef4444" fontSize="9" fontWeight="bold">
              REJECT: Notch stress riser
            </text>
          </g>

          {/* Card 2: Porosity */}
          <g transform="translate(225, 45)">
            <rect
              width="150"
              height="150"
              rx="6"
              fill="#1e293b"
              stroke="#f59e0b"
              strokeWidth="2"
            />
            <text x="15" y="25" fill="#fbbf24" fontSize="11" fontWeight="bold">
              Gas Porosity Clusters
            </text>
            <circle
              cx="65"
              cy="85"
              r="4"
              fill="#0f172a"
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
            <circle
              cx="80"
              cy="95"
              r="6"
              fill="#0f172a"
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
            <circle
              cx="95"
              cy="80"
              r="5"
              fill="#0f172a"
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
            <text x="15" y="135" fill="#94a3b8" fontSize="8">
              Trapped hydrogen gas
            </text>
            <text x="15" y="148" fill="#f59e0b" fontSize="9" fontWeight="bold">
              REJECT if &gt; 3mm diameter
            </text>
          </g>

          {/* Card 3: Lack of Penetration */}
          <g transform="translate(410, 45)">
            <rect
              width="150"
              height="150"
              rx="6"
              fill="#1e293b"
              stroke="#dc2626"
              strokeWidth="2"
            />
            <text x="15" y="25" fill="#f87171" fontSize="11" fontWeight="bold">
              Lack of Penetration (LOP)
            </text>
            <rect x="25" y="70" width="45" height="40" fill="#475569" />
            <rect x="80" y="70" width="45" height="40" fill="#475569" />
            <line
              x1="70"
              y1="70"
              x2="70"
              y2="110"
              stroke="#ef4444"
              strokeWidth="4"
            />
            <text x="15" y="135" fill="#94a3b8" fontSize="8">
              Root face unfused gap
            </text>
            <text x="15" y="148" fill="#dc2626" fontSize="9" fontWeight="bold">
              ZERO TOLERANCE: Critical
            </text>
          </g>
        </svg>
      );

    case 'traceability_lineage':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Genealogy Tree: Heat -> Coil -> Pipe -> Cert */}
          {[
            {
              x: 50,
              title: 'Steel Heat #',
              val: 'HEAT-9842',
              color: '#38bdf8',
            },
            {
              x: 180,
              title: 'Master Coil ID',
              val: 'COIL-7704',
              color: '#f59e0b',
            },
            {
              x: 310,
              title: 'Pipe Serial #',
              val: 'PIPE-1042',
              color: '#22c55e',
            },
            {
              x: 440,
              title: 'MTR 3.1 Cert',
              val: 'DOC-5099',
              color: '#e2e8f0',
            },
          ].map((box, i) => (
            <g key={box.x}>
              <rect
                x={box.x}
                y="85"
                width="110"
                height="65"
                rx="6"
                fill="#1e293b"
                stroke={box.color}
                strokeWidth="2"
              />
              <text x={box.x + 12} y="110" fill="#cbd5e1" fontSize="9">
                {box.title}
              </text>
              <text
                x={box.x + 12}
                y="132"
                fill={box.color}
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {box.val}
              </text>
              {i < 3 && (
                <polygon
                  points={`${box.x + 120},112 ${box.x + 130},117 ${box.x + 120},122`}
                  fill="#94a3b8"
                />
              )}
            </g>
          ))}

          <text x="160" y="50" fill="#e2e8f0" fontSize="12" fontWeight="bold">
            Unbroken 1-to-1 Material Pedigree Lineage (EN 10204 Type 3.1)
          </text>
        </svg>
      );

    case 'quarantine_ncr':
      return (
        <svg
          viewBox="0 0 600 240"
          className="w-full h-auto max-h-64 rounded-xl border border-slate-300 bg-gradient-to-b from-slate-900 to-[#102a43] p-2"
          aria-label={title}
        >
          {/* Quarantine Bay Segregation Barrier */}
          <line
            x1="50"
            y1="60"
            x2="550"
            y2="60"
            stroke="#f59e0b"
            strokeWidth="6"
            strokeDasharray="20,15"
          />
          <text x="180" y="50" fill="#f59e0b" fontSize="11" fontWeight="bold">
            PHYSICAL QUARANTINE BAY — DO NOT ENTER
          </text>

          {/* Quarantined Pipe Body */}
          <rect
            x="100"
            y="90"
            width="400"
            height="70"
            rx="4"
            fill="#334155"
            stroke="#dc2626"
            strokeWidth="2.5"
          />

          {/* Red Hold Tags on Both Ends */}
          <rect
            x="70"
            y="100"
            width="55"
            height="50"
            rx="3"
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <text x="80" y="120" fill="#ffffff" fontSize="9" fontWeight="bold">
            HOLD
          </text>
          <text x="75" y="135" fill="#fef08a" fontSize="7" fontWeight="bold">
            NCR-042
          </text>

          <rect
            x="475"
            y="100"
            width="55"
            height="50"
            rx="3"
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <text x="485" y="120" fill="#ffffff" fontSize="9" fontWeight="bold">
            HOLD
          </text>
          <text x="480" y="135" fill="#fef08a" fontSize="7" fontWeight="bold">
            NCR-042
          </text>

          {/* Electronic Hold Status Badge */}
          <rect
            x="190"
            y="180"
            width="220"
            height="30"
            rx="4"
            fill="#1e293b"
            stroke="#dc2626"
            strokeWidth="2"
          />
          <text x="210" y="200" fill="#ef4444" fontSize="10" fontWeight="bold">
            MES SYSTEM LOCKED: QA DISPOSITION REQ.
          </text>
        </svg>
      );

    default:
      return (
        <div className="flex h-48 w-full items-center justify-center rounded-xl border border-slate-300 bg-slate-100 text-xs text-slate-500">
          Manufacturing schematic preview: {title}
        </div>
      );
  }
}
