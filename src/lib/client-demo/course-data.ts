import type { CourseData, DemoUserProfile } from './types';

export const DEMO_USER: DemoUserProfile = {
  id: 'usr_demo_rajesh_sharma',
  employeeCode: 'WCL-DEMO-7042',
  fullName: 'Rajesh Sharma',
  jobTitle: 'Junior Pipe Production Operator',
  plantLocation: 'Anjar Manufacturing Division (Mill 1)',
  department: 'HSAW Spiral Pipe Operations',
  shift: 'Shift A (General Operations)',
  avatarInitials: 'RS',
};

export const DEMO_COURSES: CourseData[] = [
  {
    id: 'pipe-process-101',
    code: 'MFG-HSAW-01',
    title: 'From Steel Coil to Finished Pipe',
    subtitle: 'The Helical Submerged Arc Welding (HSAW) Process Journey',
    description:
      'Follow the journey of a hot-rolled steel strip as it uncoils, levels, forms helically at calculated angles, welds inside and out under submerged arc flux, undergoes non-destructive testing, and releases as a high-strength pipeline.',
    category: 'Manufacturing Process',
    estimatedMinutes: 25,
    badgeLabel: 'Core Process',
    thumbnailType: 'pipe_process',
    scenes: [
      {
        id: 'scene-1-coil-receiving',
        number: 1,
        title: 'Incoming Coil Inspection & Traceability',
        subtitle: 'Receiving, Hard Stamping & Heat Lineage Verification',
        story:
          'A 28-metric-ton hot-rolled steel coil arrives on the heavy transport saddle at Bay 1. Before the overhead gantry crane mounts it onto the decoiler car, the operator must verify the physical heat stamp against the mill test certificate (MTR) to prevent mixed-steel heats in high-pressure gas pipeline orders.',
        diagramType: 'coil_receiving',
        explanations: {
          eli5: {
            title: 'Checking the Flour Before Baking',
            analogy:
              'Before you bake a cake, you check the flour bag label and expiration date. If you grab salt by mistake, everything you bake is ruined. Here, before we roll a 28-ton roll of steel, we double-check its name tag so we never make a pipe with the wrong steel recipe!',
            body: 'Hot-rolled steel coils look identical from the outside, but each coil has a unique chemical recipe (heat number) certified for specific strength. Checking the tag and thickness first protects the entire production line.',
          },
          operator: {
            title: 'Station 1 Receiving Checklist',
            checkpoints: [
              'Scan barcode tag and compare against SAP/MES production schedule.',
              'Locate the low-stress hard stamp on the strip outer wrap and confirm Heat Number, Coil ID, and Steel Grade (e.g., API 5L X70M).',
              'Perform 3-point ultrasonic thickness measurement: operator side edge, centerline, and drive side edge.',
              'Inspect coil edges for physical transit damage, gouges, or telescoping exceeding 30 mm.',
            ],
            cues: [
              'Audible beep and green screen indicator on handheld barcode terminal.',
              'Clear contrast on low-stress dot-matrix stamp on strip edge.',
              'Thickness reading stable within ±0.2 mm of nominal specification.',
            ],
            warnings:
              'CRITICAL: Never load an untagged, illegible, or discrepant coil onto the decoiler car. If heat numbers differ by even one digit, apply a Yellow Hold tag immediately.',
          },
          engineer: {
            title: 'Material Compliance & Metallurgical Specification',
            specifications:
              'Compliance with API Spec 5L 46th Edition (PSL2) and ISO 3183. Incoming strip material must meet specified minimum yield strength (SMYS Rt0.5 >= 485 MPa) and ultimate tensile strength (Rm >= 570 MPa).',
            parameters: {
              'Steel Grade': 'API Spec 5L X70M (Thermo-Mechanically Rolled)',
              'Carbon Equivalent (CEpcm)': '<= 0.20% for optimal weldability',
              'Nominal Strip Width': '1500 mm (+5.0 / -0.0 mm)',
              'Nominal Thickness': '14.3 mm (Tolerance: +0.4 / -0.2 mm)',
            },
            standards: [
              'API Spec 5L Table 5',
              'ISO 3183 PSL2 Annex H',
              'ASTM A751 Ladle Analysis',
            ],
            technicalNote:
              'Incoming strip ultrasonic lamination screening confirms acceptance to Level E2. Laminations along edges within 25 mm of milling boundary must not exceed 6 mm cumulative length.',
          },
        },
        quiz: {
          question:
            'You scan an incoming coil tag marked Heat #8410, but the permanent hard stamp pressed into the coil edge clearly reads Heat #8419. What is your correct first action?',
          context:
            'The crane operator is waiting to load the coil on the entry saddle to keep the line moving.',
          options: [
            {
              id: 'opt-1',
              text: 'Proceed with uncoiling because the numbers only differ by the last single digit.',
              isCorrect: false,
              explanation:
                'Incorrect. In certified pipeline manufacturing, a single digit difference represents an entirely different metallurgical batch. Mixing heats without authorization invalidates customer certifications.',
            },
            {
              id: 'opt-2',
              text: 'Immediately halt loading, affix a physical Yellow Hold tag, and notify Quality Control.',
              isCorrect: true,
              explanation:
                'Correct! Material traceability in API 5L manufacturing is absolute. Any conflict between digital paperwork and physical steel stamps mandates an immediate Hold and quality escalation before the coil enters processing.',
            },
            {
              id: 'opt-3',
              text: 'Take a permanent marker and rewrite the tag number over the steel stamp.',
              isCorrect: false,
              explanation:
                'Incorrect. Tampering with or altering hard-stamped numbers is a severe compliance violation and constitutes falsification of quality records.',
            },
            {
              id: 'opt-4',
              text: 'Uncoil the first 5 meters to see if the inner stamp matches the tag.',
              isCorrect: false,
              explanation:
                'Incorrect. Loading and uncoiling discrepant material risks contaminating downstream cutters and welders. Verification must occur prior to mounting.',
            },
          ],
          standardReference:
            'API 5L Section 10.2 / Welspun QAP Traceability Clause 4.1',
        },
        practicalTakeaway:
          'Traceability begins before the steel is cut. When in doubt on heat lineage, stop and tag.',
      },
      {
        id: 'scene-2-strip-prep',
        number: 2,
        title: 'Strip Preparation: Leveling & Edge Milling',
        subtitle: 'Decoiling, 9-Roll Flattener & Double-V Edge Preparation',
        story:
          'The steel coil unwinds through the heavy hydraulic peeler knife into the 9-roll flattener. To eliminate residual curvature from coiling, alternating hydraulic rolls level the steel strip flat. High-speed carbide milling cutters then shave both edges simultaneously into precision double-V bevels.',
        diagramType: 'strip_prep',
        explanations: {
          eli5: {
            title: 'Ironing Out Wrinkles & Trimming the Edges',
            analogy:
              'Imagine a long roll of wrapping paper that keeps curling back up when you let go. You pull it through heavy rolling pins to iron it completely flat. Then you use a sharp ruler to trim both sides razor-straight so the edges can touch with zero wobble.',
            body: 'Flattening takes out the curling memory of the steel roll, and edge milling cleans away mill scale and shapes the sides so the welding robot can join them with deep, strong welds.',
          },
          operator: {
            title: 'Leveler & Milling Station Checks',
            checkpoints: [
              'Inspect top and bottom leveler roll surfaces for foreign metal particles or gouges.',
              'Verify hydraulic leveler pressure is within target setpoint (175 - 195 bar).',
              'Check edge milling carbide indexable inserts every 400 meters for chipping or excessive wear.',
              'Measure milled bevel geometry using the calibrated protractor gauge: 30° (+2°/-0°) and 1.5 mm root face.',
            ],
            cues: [
              'Smooth, flat strip exit from leveler without edge wave or center buckle.',
              'Continuous, uniform curly steel chips discharging into the swarf collector.',
              'Clean, shiny metallic silver finish along both milled strip edges.',
            ],
            warnings:
              'CAUTION: Never touch moving steel strip or attempt to remove chips with bare hands. Use brass scrapers and keep safety guards closed while milling spindles rotate.',
          },
          engineer: {
            title: 'Plastic Deformation & Weld Joint Geometry',
            specifications:
              'Elastic-plastic reverse bending in the 9-roll leveler reduces residual stress differential across the strip cross-section. Symmetrical double-V groove geometry ensures balanced weld deposition volume.',
            parameters: {
              'Leveler Roll Diameter': '280 mm forged alloy steel rolls',
              'Milling Spindle Speed':
                '350 - 450 RPM (Tungsten carbide inserts)',
              'Bevel Angle': '30° ± 2° (included angle 60°)',
              'Root Face (Land)': '1.5 mm ± 0.5 mm uniform thickness',
            },
            standards: [
              'AWS D1.1 / API 1104 Bevel Geometry',
              'ISO 9692-1 Welding Joint Preparation',
            ],
            technicalNote:
              'Maintaining a strictly uniform root face is critical for Submerged Arc Welding; an oversized root face leads to Lack of Penetration (LOP), while an undersized root face causes excessive burn-through.',
          },
        },
        quiz: {
          question:
            'During mid-shift inspection, your bevel gauge shows the drive-side root face has widened to 3.2 mm (target: 1.5 mm). What is the primary welding risk if this strip continues into the forming head?',
          context:
            'The milling machine vibration has slightly shifted the vertical cutter cartridge.',
          options: [
            {
              id: 'opt-1',
              text: 'The pipe will suffer Lack of Penetration (LOP) in the root seam.',
              isCorrect: true,
              explanation:
                'Correct! When the root face is twice as thick as specified (3.2 mm vs 1.5 mm), the heat from the submerged arc welding electrodes cannot completely fuse through the root thickness, leaving an unfused seam gap (Lack of Penetration).',
            },
            {
              id: 'opt-2',
              text: 'The pipe will immediately become oval during hydrostatic testing.',
              isCorrect: false,
              explanation:
                'Incorrect. Ovality is governed by roll forming geometry and cold expanding, not root face thickness.',
            },
            {
              id: 'opt-3',
              text: 'The outer pipe coating will crack during cooling.',
              isCorrect: false,
              explanation:
                'Incorrect. External 3LPE coating occurs much later downstream after pipe fabrication and testing.',
            },
            {
              id: 'opt-4',
              text: 'The strip will slip off the drive roller conveyor.',
              isCorrect: false,
              explanation:
                'Incorrect. Edge bevel geometry does not control strip mechanical conveyor traction.',
            },
          ],
          standardReference:
            'WPS-HSAW-01 / API 5L Appendix D Welding Procedures',
        },
        practicalTakeaway:
          'Precise edge milling geometry guarantees sound root fusion. Monitor insert wear and root land constantly.',
      },
      {
        id: 'scene-3-helical-forming',
        number: 3,
        title: 'Helical Forming & Three-Roll Geometry',
        subtitle: 'Forming Angle Kinematics & Dynamic Continuous Curvature',
        story:
          'The flat, milled strip enters the forming head at a carefully calibrated angle α. Three heavy hydraulic bending rolls curve the strip continuously into a hollow spiral cylinder. As the strip curls around, its trailing edge meets the leading edge of the previously formed spiral loop with sub-millimeter precision.',
        diagramType: 'helical_forming',
        hasInteractiveVisualizer: true,
        explanations: {
          eli5: {
            title: 'Rolling a Ribbon into a Spiral Straw',
            analogy:
              'Have you ever wrapped a paper ribbon around a cardboard tube or noticed how paper towel cores have spiral seams? If you push paper into rollers straight, you get a short ring. But if you push it in at a slant angle, it curls forward into an endless hollow pipe!',
            body: 'By changing the slant angle (the forming angle), a factory can use the exact same width of steel strip to make many different pipe diameters—from water pipes to massive gas mains.',
          },
          operator: {
            title: 'Forming Head Console Operation',
            checkpoints: [
              'Verify forming angle setting on the digital resolver readout matches the setup sheet for the scheduled pipe diameter.',
              'Observe laser seam tracker camera monitor: ensure seam gap remains between 0.6 mm and 1.2 mm.',
              'Inspect edge offset ("high-low") across the meeting strip edges; must not exceed 1.0 mm.',
              'Check hydraulic roll pressure balance across the primary bending roll, exit roll, and bottom guide support.',
            ],
            cues: [
              'Laser alignment line centered directly over the converging joint groove.',
              'Consistent light gap visible between edges prior to tacking.',
              'Smooth continuous pipe rotation on the output guide carriage.',
            ],
            warnings:
              'ATTENTION: Never force strip edges together if strip camber creates overlap. Adjust the hydraulic side guide roll in micro-increments (0.5 mm steps).',
          },
          engineer: {
            title: 'Helical Kinematics & Diameter Formulation',
            specifications:
              'The fundamental geometric relationship for HSAW pipes relates pipe mean diameter (D), strip width (W), and forming angle (alpha): sin(alpha) = W / (pi * D).',
            parameters: {
              'Pipe Outer Diameter (OD)': '1219.2 mm (48 inches nominal)',
              'Strip Width (W)': '1500 mm nominal',
              'Theoretical Forming Angle':
                '23.05° (sin α = 1500 / [π * 1219.2] = 0.3916)',
              'Allowable Seam Mismatch':
                '<= 1.5 mm per API 5L Section 10.2.8.5',
            },
            standards: [
              'API Spec 5L Section 10.2.8',
              'ASME B31.4 / B31.8 Pipeline Design',
            ],
            technicalNote:
              'Springback compensation requires three-point roll bending to exceed steel yield into the outer fiber plastic deformation regime. Residual stress redistribution is validated during post-expansion or hydrostatic sizing.',
          },
        },
        quiz: {
          question:
            'While observing the laser seam tracker at 48-inch pipe production, you notice the gap is pinching shut (0.0 mm) and strip edges are beginning to climb over each other. Which corrective action should the operator take?',
          context:
            'A slight strip camber in the incoming coil is pushing the strip harder against the inner guide.',
          options: [
            {
              id: 'opt-1',
              text: 'Increase welding arc amperage to melt the overlapped steel away.',
              isCorrect: false,
              explanation:
                'Incorrect. Welding over overlapped edges creates gross mechanical misalignment, severe weld defects, and potential torch burnouts.',
            },
            {
              id: 'opt-2',
              text: 'Fine-tune the exit guide roll / adjust side guide position to restore the proper 0.6–1.2 mm seam gap.',
              isCorrect: true,
              explanation:
                'Correct! Compensating for incoming coil camber requires micro-adjustment of the side guide roll and exit roll position, relieving mechanical edge overlap and restoring the nominal seam gap before welding.',
            },
            {
              id: 'opt-3',
              text: 'Speed up the line feed drive to break through the pinch point.',
              isCorrect: false,
              explanation:
                'Incorrect. Accelerating into edge overlap can jam the forming head, fracture roll bearings, or cause emergency line trip.',
            },
            {
              id: 'opt-4',
              text: 'Shut off the laser seam tracker so alarms stop sounding.',
              isCorrect: false,
              explanation:
                'Incorrect. Disabling safety and tracking sensors violates operating procedures and leads to uncontrolled product defects.',
            },
          ],
          standardReference:
            'Standard Operating Procedure SOP-FORM-03: Camber & Gap Control',
        },
        practicalTakeaway:
          'Forming angle and edge gap determine weld geometry. Never let strip edges overlap before the welding torch.',
      },
      {
        id: 'scene-4-submerged-arc-welding',
        number: 4,
        title: 'Submerged Arc Welding (SAW)',
        subtitle: 'Dual-Sided Tandem Wire SAW Under Granular Flux Blanket',
        story:
          'Immediately after temporary continuous gas-metal arc tacking, the formed helical seam is welded permanently using Submerged Arc Welding (SAW). The process occurs in two passes: first on the inside of the pipe (ID pass) and then on the outside (OD pass), with high-amperage wire electrodes buried deep beneath a blanket of protective granular flux.',
        diagramType: 'submerged_arc_welding',
        explanations: {
          eli5: {
            title: 'Electric Welding Hidden Under a Blanket of Sand',
            analogy:
              'Imagine gluing two metal plates together with lightning-hot electricity. But hot metal hates oxygen in the air—air makes it crackle, bubble, and turn brittle. So we pour a heavy blanket of gray sand (called flux) over the wire. The spark melts the metal in secret under the blanket with no smoke, no sparks, and no air bubbles!',
            body: 'Once the seam cools, the baked sand turns into glass-like slag that chips away easily, revealing a smooth, shiny silver weld bead stronger than the original steel.',
          },
          operator: {
            title: 'SAW Welding Console Station',
            checkpoints: [
              'Verify preheat temperature on thick-wall strip is above minimum threshold (> 80°C).',
              'Check flux delivery hopper level and ensure vacuum suction returns unfused flux continuously.',
              'Monitor welding electrical parameters on console: Lead Wire (DC+) 850A / 34V; Trail Wire (AC) 750A / 38V.',
              'Verify flux is clean, dry, and baked per procedure (moisture content < 0.1%).',
            ],
            cues: [
              'Solid slag crust detaches cleanly from the bead surface behind the vacuum shoe.',
              'Zero sparks or smoke escaping through the flux blanket during arc operation.',
              'Smooth, uniform bead crown with gentle transition into pipe body metal.',
            ],
            warnings:
              'DANGER: Do not look directly into the arc if flux blanket becomes thin or displaced. Wear approved shade-10 welding protection when setting wire nozzles.',
          },
          engineer: {
            title: 'Tandem Multi-Wire Metallurgy & Heat Input Control',
            specifications:
              'Submerged Arc Welding (SAW) using multi-wire tandem configuration (Lead DC+ for deep penetration; Trail AC for smooth surface tie-in and bead contour). Heat input formula: H = η * (V * I * 60) / (v * 1000) [kJ/mm].',
            parameters: {
              'Lead Wire (DC+)':
                '850 Amperes / 34 Volts (4.0 mm solid electrode wire)',
              'Trail Wire (AC)':
                '750 Amperes / 38 Volts (3.2 mm solid electrode wire)',
              'Welding Travel Speed (v)': '1.4 - 1.8 m/min continuous',
              'Calculated Heat Input':
                '1.8 - 2.4 kJ/mm (preserves HAZ Charpy impact toughness)',
            },
            standards: [
              'ASME Boiler & Pressure Vessel Code Section IX',
              'API 5L Annex D / AWS A5.17',
            ],
            technicalNote:
              'Tandem wire magnetic arc blow is mitigated by spacing the electrodes 18–25 mm apart and feeding the trail wire on alternating current (AC) with phase displacement.',
          },
        },
        quiz: {
          question:
            'A flux hopper heating element fails, allowing cold, ambient humid flux to enter the welding zone. What critical weld defect is most likely to develop?',
          context:
            'Atmospheric humidity is 85% during monsoon season at the plant.',
          options: [
            {
              id: 'opt-1',
              text: 'Excessive pipe ovality.',
              isCorrect: false,
              explanation:
                'Incorrect. Ovality is governed by roll forming geometry, not weld flux chemistry.',
            },
            {
              id: 'opt-2',
              text: 'Hydrogen-induced cold cracking and wormhole porosity in the weld bead.',
              isCorrect: true,
              explanation:
                'Correct! Moisture in SAW flux dissociates at arc temperatures into atomic hydrogen and oxygen. Hydrogen dissolves into the molten weld pool and causes porosity, as well as delayed cold cracking (Hydrogen-Induced Cracking - HIC) as the weld cools under restraint.',
            },
            {
              id: 'opt-3',
              text: 'Premature dulling of the edge milling cutters.',
              isCorrect: false,
              explanation:
                'Incorrect. Edge milling occurs upstream before the strip enters the welding station.',
            },
            {
              id: 'opt-4',
              text: 'Loss of hydraulic pump pressure in the uncoiler.',
              isCorrect: false,
              explanation:
                'Incorrect. Welding flux moisture has no interaction with hydraulic fluid systems.',
            },
          ],
          standardReference:
            'WPS-HSAW-01 Section 6: Flux Storage, Baking and Handling',
        },
        practicalTakeaway:
          'Dry flux and stable electrical parameters prevent porosity. Guard against moisture at all times.',
      },
      {
        id: 'scene-5-quality-testing',
        number: 5,
        title: 'Quality Testing: Hydrostatic & NDT',
        subtitle:
          '100% Phased-Array Ultrasonic Testing & Proof Pressure Hydrotesting',
        story:
          'After the continuous pipe is cut into 12-meter lengths by the automated flying plasma saw, each individual pipe joint undergoes rigorous non-destructive evaluation. First, an automated multi-probe Ultrasonic Testing (UT) gantry scans the entire spiral weld seam. Then the pipe is clamped in the hydrostatic tester and pumped with high-pressure water to stress the steel to 90% of its yield limit.',
        diagramType: 'quality_testing',
        explanations: {
          eli5: {
            title: 'Medical Ultrasound + High-Pressure Balloon Test',
            analogy:
              'Before a submarine dives into deep ocean water, engineers test its hull two ways: first, they use ultrasound sensors (just like hospital ultrasound scans for babies) to look inside the metal for invisible cracks. Then they pump it full of high-pressure water to prove it will never pop under pressure!',
            body: 'We test every single pipe with ultrasonic sound waves and hold it under extreme water pressure for a full 10 seconds. If there is even the tinniest pinhole or hidden crack, this test catches it before the pipe leaves the mill.',
          },
          operator: {
            title: 'Hydrostatic & UT Inspection Operations',
            checkpoints: [
              'Verify all air is purged through air bleed valves before pressure ramp-up.',
              'Confirm target test pressure setpoint on digital chart recorder (e.g. 145 bar / 2100 PSI).',
              'Hold test pressure for mandatory duration (minimum 10.0 seconds per API 5L).',
              'Watch pressure decay curve: pressure drop must be 0.0 bar during the hold window.',
              'Check automated UT console for green pass status on weld seam and heat-affected zone (HAZ).',
            ],
            cues: [
              'Stable flat pressure trace on chart recorder during the 10-second hold.',
              'Zero water mist, spray, or moisture weeping from weld seams or end tooling seals.',
              'No audible acoustic alarms or threshold spike trips on the automated UT console.',
            ],
            warnings:
              'SAFETY NOTICE: Stay behind safety blast shields while pipe is under hydrostatic pressure. High-pressure water jet injection can cause catastrophic injury.',
          },
          engineer: {
            title: 'Hydrostatic Stress Equations & Phased Array NDT',
            specifications:
              'Hydrostatic proof pressure calculated in accordance with API Spec 5L Section 10.2.6.7: P = (2 * S * t) / D * 0.90, stressing the pipe body to 90% SMYS for 10 seconds minimum.',
            parameters: {
              'Test Pressure Calculation':
                'P = (2 * 485 MPa * 14.3 mm * 0.90) / 1219.2 mm = 10.24 MPa (102.4 bar)',
              'Mandatory Hold Duration':
                '10 seconds minimum with calibrated data logging',
              'NDT Calibration Standard':
                'API 5L Annex E reference notch standard (N5 notch: 5% wall depth)',
              'Defect Acceptance Threshold':
                'Echo amplitude < 100% of reference distance amplitude curve (DAC)',
            },
            standards: [
              'API Spec 5L Section 10.2.6',
              'ISO 10893-11 Automated Weld UT',
              'ASME B31.8 Chapter VI',
            ],
            technicalNote:
              'Automated UT arrays incorporate longitudinal and transverse beam angles (45°, 60°, and 70°) plus 0° compression wave probes to verify full-volume weld integrity and laminations.',
          },
        },
        quiz: {
          question:
            'During the 10-second hydrostatic test hold at 145 bar, the digital chart recorder shows pressure dropping steadily from 145 bar down to 132 bar. No water is spraying from the end gaskets. What does this indicate?',
          context:
            'The pipe joint is pressurized with filtered water inside the guarded test bay.',
          options: [
            {
              id: 'opt-1',
              text: 'The test passes because pressure stayed above 130 bar.',
              isCorrect: false,
              explanation:
                'Incorrect. API 5L mandates zero pressure drop during the hold period. Any drop indicates loss of containment.',
            },
            {
              id: 'opt-2',
              text: 'The water was too cold, which caused normal thermal contraction.',
              isCorrect: false,
              explanation:
                'Incorrect. A 13-bar pressure drop in 10 seconds cannot be attributed to ambient thermal contraction in heavy industrial pipe bodies.',
            },
            {
              id: 'opt-3',
              text: 'A pressure-containing leak or micro-fissure is present; the pipe fails the test and must be quarantined.',
              isCorrect: true,
              explanation:
                'Correct! Any measurable pressure drop during the mandatory hold duration proves that pressurized water is escaping through a through-weld flaw, pinhole, or structural defect. The pipe fails proof testing and must be quarantined for NDT root-cause investigation.',
            },
            {
              id: 'opt-4',
              text: 'The operator should immediately repressurize to 160 bar to seal the leak.',
              isCorrect: false,
              explanation:
                'Incorrect. Never over-pressurize a leaking pipe under test; doing so risks catastrophic burst and violates certified test procedures.',
            },
          ],
          standardReference:
            'API 5L Section 10.2.6 / Mill Test Procedure TP-HYDRO-01',
        },
        practicalTakeaway:
          'Hydrostatic pressure testing proves integrity under real stress. Never accept a pressure drop.',
      },
      {
        id: 'scene-6-release-dispatch',
        number: 6,
        title: 'Release & Dispatch: Coating & Traceability Stencil',
        subtitle:
          'Precision End Beveling, 3LPE External Coating & Final Stenciling',
        story:
          'Having passed all mechanical and non-destructive quality gates, the pipe joint enters the finishing bay. Machine tools face and bevel the pipe ends to precise angles for pipeline field welding. The outer surface receives a high-performance 3-Layer Polyethylene (3LPE) anti-corrosion coating, followed by automated computer-controlled white stencil marking of full pedigree data.',
        diagramType: 'release_dispatch',
        explanations: {
          eli5: {
            title: 'Waterproof Jacket & the Official Birth Certificate',
            analogy:
              'Finally, the pipe gets its protective waterproof coat and its official graduation certificate! The 3-layer green coating protects the metal from rust in muddy underground soil for over 50 years, and the crisp white text stenciled on its side tells pipeline builders exactly who made it, when, and how strong it is.',
            body: 'Every single pipe leaves the plant with an unalterable pedigree. Even decades from now, pipeline engineers in the field can read the stencil and pull up every test chart from our plant archives.',
          },
          operator: {
            title: 'Finishing & Dispatch Checklist',
            checkpoints: [
              'Inspect end bevel angle (30° with 1.6 mm root face) using calibrated bevel protractor.',
              'Run the high-voltage holiday detector spark brush (25 kV) over 100% of the coated pipe body; ensure zero spark alarms.',
              'Verify dry film thickness (DFT) of 3LPE coating exceeds minimum contract specification (> 2.8 mm).',
              'Check stenciled text on pipe body and inside diameter end: verify Heat Number, Pipe Serial Number, Steel Grade, and Welspun Monogram.',
            ],
            cues: [
              'Clean, continuous high-density polyethylene coating surface free of pinholes or blistering.',
              'Zero sparks or alarm chirps during 25 kV electric holiday testing.',
              'Sharp, high-contrast, perfectly legible white stencil marking.',
            ],
            warnings:
              'FINAL AUDIT: Never apply the QA release inspection stamp if any barcode, hard stamp, or stencil parameter conflicts with the final release dossier.',
          },
          engineer: {
            title: 'Corrosion Protection & Pipeline Interfacing',
            specifications:
              'External 3-Layer Polyethylene (3LPE) per ISO 21809-1 (Layer 1: Fusion Bonded Epoxy > 150 µm; Layer 2: Grafted Copolymer Adhesive > 200 µm; Layer 3: High Density Polyethylene > 2.5 mm). End bevels per ASME B16.25 for mechanized field girth welding.',
            parameters: {
              'Field Bevel Geometry':
                '30° (+2.5°/-0°) with 1.6 mm ± 0.8 mm root face land',
              'Coating Spark Test Voltage':
                '25 kV (zero holiday tolerance per ISO 21809-1)',
              'Traceability Stencil':
                'WELSPUN CORP - 48" X 0.562" - API 5L X70M PSL2 - HEAT 9842 - PIPE 1042',
              'Design Life':
                '50+ years underground cathodic protection compatibility',
            },
            standards: [
              'ISO 21809-1 External Polyolefin Coatings',
              'ASME B16.25 Butt-welding Ends',
              'API Spec 5L Section 11',
            ],
            technicalNote:
              'Traceability dossier archives digital records linking the pipe unique serial number directly to raw material MTR, welding heat input data, ultrasonic scans, and hydrostatic pressure graphs.',
          },
        },
        quiz: {
          question:
            'While testing the coated pipe body with the 25 kV holiday spark detector, a loud buzzer sounds and an electric blue spark jumps from the brush to the pipe metal at the 7-meter mark. What is the required disposition?',
          context:
            'The pipe is on the final inspection roller bed prior to railcar loading.',
          options: [
            {
              id: 'opt-1',
              text: 'Wipe the area with a wet cloth to silence the alarm and approve the pipe.',
              isCorrect: false,
              explanation:
                'Incorrect. Silencing alarms without investigation conceals coating defects that cause premature pipeline corrosion in field service.',
            },
            {
              id: 'opt-2',
              text: 'Paint over the spot with standard industrial spray paint.',
              isCorrect: false,
              explanation:
                'Incorrect. Spray paint does not meet 3LPE dielectric insulation or moisture barrier requirements.',
            },
            {
              id: 'opt-3',
              text: 'Mark the pinhole (holiday), perform an approved heat-shrink patch repair per procedure, and re-test with the spark detector.',
              isCorrect: true,
              explanation:
                'Correct! The spark detector detects a microscopic pinhole or void through the polyethylene layer down to the bare steel. Per ISO 21809-1, the defect must be marked, abraded, repaired with an approved cross-linked polyolefin repair patch, and 100% spark re-tested before release.',
            },
            {
              id: 'opt-4',
              text: 'Ship the pipe as-is because the customer will apply field tape anyway.',
              isCorrect: false,
              explanation:
                'Incorrect. Factory-applied coatings must meet zero-holiday acceptance prior to delivery.',
            },
          ],
          standardReference:
            'ISO 21809-1 Clause 10.3 Holiday Testing / Coating QAP-3LPE-01',
        },
        practicalTakeaway:
          'The finished pipe carries the Welspun name. 100% coating integrity and clear stenciling ensure 50 years of safe service.',
      },
    ],
  },
  {
    id: 'safety-essentials-102',
    code: 'SAF-IND-01',
    title: 'Shop Floor Safety Essentials',
    subtitle: 'High-Hazard Industrial Protocols & Zero-Incident Operations',
    description:
      'Master the critical plant safety principles required across heavy manufacturing: full personal protective equipment (PPE), heavy crane suspended load hazards, Lockout/Tagout (LOTO) energy isolation, and proactive incident reporting.',
    category: 'Shop Floor Safety',
    estimatedMinutes: 15,
    badgeLabel: 'Mandatory Safety',
    thumbnailType: 'safety_gear',
    scenes: [
      {
        id: 'scene-1-ppe',
        number: 1,
        title: 'Personal Protective Equipment & Plant Zones',
        subtitle: 'Head-to-Toe Protection & Pedestrian Walkway Compliance',
        story:
          'Entering the high-bay manufacturing area requires immediate transition into full industrial PPE. Massive 30-ton steel coils, high-temperature plasma cutters, and heavy overhead cranes operate 24 hours a day. Marked yellow floor pathways protect pedestrians from automated transfer buggies and heavy machinery.',
        diagramType: 'ppe_safety',
        explanations: {
          eli5: {
            title: 'Your Personal Shield in a Heavy Steel Castle',
            analogy:
              'Think of PPE like a knight putting on their suit of armor. In a giant steel factory where 30-ton steel rolls move around, your hard hat protects your head, steel-toe boots protect your feet, and high-visibility yellow vests ensure crane operators can see you from high above!',
            body: 'Every item of safety gear has a specific purpose. You would never ride a motorcycle without a helmet; in a steel plant, wearing your safety gear is the very first rule of keeping everyone safe.',
          },
          operator: {
            title: 'Turnstile PPE Verification Checklist',
            checkpoints: [
              'Hard hat securely fastened with 4-point ratchet suspension (ensure no cracks or stickers hiding damage).',
              'Safety glasses with side shields certified to ANSI Z87.1 (over-glasses for prescription wearers).',
              'Class 2 High-Visibility reflective safety vest zipped shut over clothing.',
              'Steel-toe safety boots with integrated metatarsal guard (ASTM F2413 approved).',
              'Hearing protection (earplugs or earmuffs) with NRR rating > 28 dB.',
            ],
            cues: [
              'Comfortable, snug fit on all straps and fasteners.',
              'Clear peripheral vision with safety glasses in place.',
              'Staying strictly within yellow floor boundary lines.',
            ],
            warnings:
              'MANDATORY: Never wear loose clothing, ties, dangling jewelry, or uncontained long hair near rotating forming rolls or milling spindles.',
          },
          engineer: {
            title: 'Occupational Health & Ergonomics Governance',
            specifications:
              'Compliance with OSHA 1910 Subpart I and ISO 45001. Sound levels adjacent to forming mills and uncoilers peak between 92 and 104 dBA, requiring dual protection when 8-hour TWA exceeds 100 dBA.',
            parameters: {
              'Footwear Rating':
                'ASTM F2413 Class 75 (75 ft-lbs impact / 2500 lbs compression)',
              'Eye Protection Standard': 'ANSI Z87.1+ High-Impact rated lenses',
              'Hearing Conservation Threshold':
                '85 dBA Action Level (OSHA 1910.95)',
              'Walkway Width':
                'Minimum 1200 mm marked with non-slip epoxy yellow line',
            },
            standards: [
              'OSHA 1910.132 General PPE',
              'ISO 45001 Occupational Health & Safety',
            ],
            technicalNote:
              'Hierarchy of Controls prioritizes Elimination, Substitution, and Engineering Controls over PPE. PPE is the final barrier between the worker and the physical hazard.',
          },
        },
        quiz: {
          question:
            'You see a contractor walking through the active pipe transfer bay without safety glasses while a welder is grinding weld spatter 5 meters away. What should you do?',
          context:
            'You are walking along the designated yellow walkway toward your machine station.',
          options: [
            {
              id: 'opt-1',
              text: 'Ignore the contractor because they are not part of your immediate work crew.',
              isCorrect: false,
              explanation:
                'Incorrect. Safety responsibility belongs to everyone. Flying debris does not distinguish between contractors and full-time employees.',
            },
            {
              id: 'opt-2',
              text: 'Exercise your Stop-Work Authority, politely stop the contractor, and guide them to the safety glasses dispenser station.',
              isCorrect: true,
              explanation:
                'Correct! Every employee at Welspun possesses absolute Stop-Work Authority. Intervening immediately prevents irreversible eye injury from flying metallic sparks and grinding dust.',
            },
            {
              id: 'opt-3',
              text: 'Wait until the end of your shift to submit a note to HR.',
              isCorrect: false,
              explanation:
                'Incorrect. Delayed reporting does nothing to protect the worker from immediate physical danger happening right now.',
            },
            {
              id: 'opt-4',
              text: 'Shout at the contractor across the bay while continuing to walk.',
              isCorrect: false,
              explanation:
                'Incorrect. Shouting across loud machinery can startle personnel near moving equipment. Approach safely and address the hazard constructively.',
            },
          ],
          standardReference:
            'Welspun Plant Safety Policy: Stop-Work Authority Charter',
        },
        practicalTakeaway:
          'Safety gear is non-negotiable. Stop-Work Authority empowers every employee to protect anyone at risk.',
      },
      {
        id: 'scene-2-hazards',
        number: 2,
        title: 'Hazard Identification, Suspended Loads & Pinch Points',
        subtitle: 'Line of Fire Awareness & Stored Mechanical Energy',
        story:
          'Heavy manufacturing environments contain significant kinetic and stored mechanical energy. High-bay overhead cranes move 30-ton coils through the air, while tightly coiled steel strips store massive spring-like tension. Operators must stay out of the "Line of Fire" at all times.',
        diagramType: 'hazard_loads',
        explanations: {
          eli5: {
            title: 'Never Stand Under the Giant Magnet',
            analogy:
              'Imagine a giant carrying a heavy boulder overhead. Even if the giant is very careful, a rock could slip. You would never stand directly underneath the boulder! In our factory, the cranes carry massive steel coils high in the air, so we always stay outside their travel path.',
            body: 'Also, a tightly wound steel roll is like a giant wound-up metal spring. If the shipping bands are cut incorrectly, the steel can whip open with tremendous force. Staying back keeps you safe.',
          },
          operator: {
            title: 'Suspended Load & Coil Band Protocol',
            checkpoints: [
              'Listen for crane warning siren/strobe and immediately look up to locate the crane position.',
              'Never stand, walk, or position any body part beneath a suspended load or crane hook.',
              'Maintain a minimum clearance cone: distance equal to load height plus 3 meters.',
              'When cutting coil packaging bands, use pneumatic band cutters with safety hold-down arms deployed.',
              'Stand to the side outside the radial recoil arc when shearing the final steel retention band.',
            ],
            cues: [
              'Flashing amber beacon on crane bridge and audible movement buzzer.',
              'Coil resting securely in floor saddle chocks before unhooking crane C-hook.',
              'No personnel inside the yellow hazard swing perimeter.',
            ],
            warnings:
              'CRITICAL: Never step between a moving coil car and a stationary machine frame. Pinch-point crush injuries are irreversible.',
          },
          engineer: {
            title: 'Rigging Mechanics & Kinetic Energy Release',
            specifications:
              'Overhead crane rigging per ASME B30.2 and B30.20. A 28-metric-ton coil stored with 450 MPa residual coiling stress possesses significant elastic strain energy capable of rapid radial expansion upon band severance.',
            parameters: {
              'Crane Capacity': '40 Metric Ton Safe Working Load (SWL)',
              'Rigging Safety Factor':
                '5:1 minimum on lifting chocks and motorized C-hooks',
              'Safety Exclusion Zone':
                '45° cone extending from hook centerline to ground',
              'Band Severance Tooling':
                'Long-reach pneumatic shears with hydraulic strip damper',
            },
            standards: [
              'ASME B30.2 Overhead Cranes',
              'OSHA 1910.179 Overhead & Gantry Cranes',
            ],
            technicalNote:
              'Dynamic shock loading occurs if crane cables jerk during hoisting. Smooth variable frequency drive (VFD) crane motors prevent harmonic load swinging.',
          },
        },
        quiz: {
          question:
            'An overhead crane is transporting a 25-ton coil toward the uncoiler. The crane travel buzzer is sounding, and the load path passes directly over your workbench. What is your immediate action?',
          context:
            'You are preparing an ultrasonic calibration block on your workbench.',
          options: [
            {
              id: 'opt-1',
              text: 'Stay at your workbench and keep your head down until the crane passes.',
              isCorrect: false,
              explanation:
                'Incorrect. Remaining under a suspended load places you in the direct Line of Fire in the event of rigging failure or mechanical brake slip.',
            },
            {
              id: 'opt-2',
              text: 'Step back immediately out of the crane travel path to a designated safe zone until the load has fully passed.',
              isCorrect: true,
              explanation:
                'Correct! You must never remain under a suspended load. Immediately clear the travel corridor and wait until the load has moved past and lowered into its saddle.',
            },
            {
              id: 'opt-3',
              text: 'Wave at the crane operator to tell them you are working below.',
              isCorrect: false,
              explanation:
                'Incorrect. Crane operators high in the cab have limited visibility angles and cannot react in time if mechanical rigging slips.',
            },
            {
              id: 'opt-4',
              text: 'Run quickly directly underneath the moving coil to beat it to the other side.',
              isCorrect: false,
              explanation:
                'Incorrect. Running under a moving heavy load drastically increases the risk of tripping and fatal crush injury.',
            },
          ],
          standardReference:
            'Welspun High-Bay Crane Safety Standard CS-01: Line of Fire',
        },
        practicalTakeaway:
          'Never position yourself beneath a suspended load. Respect stored energy and stay out of the Line of Fire.',
      },
      {
        id: 'scene-3-loto',
        number: 3,
        title: 'Safe Equipment Operation & Lockout/Tagout (LOTO)',
        subtitle: 'Zero-Energy State Verification & Hazardous Energy Isolation',
        story:
          'A maintenance technician needs to clean weld spatter and replace the contact nozzle inside the automatic submerged arc welding head carriage. Even though the operator console switch is set to "Stop", high-voltage electrical, 200-bar hydraulic, and 8-bar pneumatic lines remain connected to the machine.',
        diagramType: 'loto_isolation',
        explanations: {
          eli5: {
            title: 'Unplugging the Giant Blender Before Cleaning It',
            analogy:
              'If you need to reach your hand inside a blender to clean sharp blades, you do not just tap the pause button—someone could accidentally bump the start switch! You unplug the cord, put a padlock on the plug, and keep the only key in your pocket.',
            body: 'Lockout/Tagout (LOTO) means locking the electricity, hydraulic fluid, and air pressure completely off with a real padlock so the machine cannot move while someone is working inside.',
          },
          operator: {
            title: 'The 6-Step LOTO Procedure',
            checkpoints: [
              '1. Notify affected operators that the machine is entering lockout.',
              '2. Shut down equipment using normal stopping sequence.',
              '3. Isolate all energy sources: turn main electrical breaker to OFF, close hydraulic isolating valve, close pneumatic valve.',
              '4. Apply personal red padlock and danger tag to the lockout hasp (one person, one lock, one key).',
              '5. Dissipate stored energy: bleed hydraulic accumulator pressure to 0 bar, drain air receivers, apply mechanical safety wedges.',
              '6. Verify Zero Energy State: push the machine start button to confirm it does not turn on, then return switch to OFF.',
            ],
            cues: [
              'Pressure gauges on hydraulic manifold read zero (0.0 bar).',
              'Personal padlock locked with key removed and kept on your person.',
              'Equipment completely dead when attempting trial start.',
            ],
            warnings:
              'NEVER rely on emergency stop buttons or interlock doors for maintenance access. E-stops are control switches, NOT energy isolation devices.',
          },
          engineer: {
            title: 'Hazardous Energy Control (OSHA 1910.147)',
            specifications:
              'Standard for the Control of Hazardous Energy (OSHA 1910.147 / ISO 14118). Machines possess multiple energy sources: electrical (415V 3-phase), hydraulic fluid under pressure, pneumatic actuators, and mechanical gravitational energy.',
            parameters: {
              'Primary Electrical Disconnect':
                'Lockable rotary isolator with visible air gap contacts',
              'Hydraulic Pressure Bleed':
                'Spring-loaded pilot dump valves to return fluid to reservoir',
              'Stored Kinetic Energy':
                'Mechanical locking pins engaged into carriage slide rails',
              'Padlock Requirement':
                'Unique keyed-different red safety padlock for each authorized worker',
            },
            standards: [
              'OSHA 1910.147 LOTO',
              'ISO 14118 Safety of Machinery — Prevention of Unexpected Start-up',
            ],
            technicalNote:
              'Software interlocks and PLC safety relays (SIL 3) provide functional safety during production, but mechanical and physical energy isolation is mandatory during maintenance interventions.',
          },
        },
        quiz: {
          question:
            'You need 30 seconds to wipe dust off an optical sensor located between two hydraulic forming rolls. Can you just press the Emergency Stop button on the pendant instead of performing full LOTO?',
          context: 'The line is running on schedule and you want to be quick.',
          options: [
            {
              id: 'opt-1',
              text: 'Yes, because 30 seconds is too short to justify full lockout.',
              isCorrect: false,
              explanation:
                'Incorrect. Duration does not alter the hazard. A machine can crush or sever a limb in less than 0.2 seconds.',
            },
            {
              id: 'opt-2',
              text: 'Yes, as long as another operator promises to stand next to the console.',
              isCorrect: false,
              explanation:
                'Incorrect. Human communication and promises fail. Another person cannot physically stop a hydraulic valve from drifting or malfunctioning.',
            },
            {
              id: 'opt-3',
              text: 'No. An E-stop is a control device, not energy isolation. Full LOTO and zero-energy verification are mandatory before placing hands in pinch points.',
              isCorrect: true,
              explanation:
                'Correct! E-stops, light curtains, and safety doors are control circuits that can short-circuit or fail. Any body entry into machinery pinch points mandates complete physical energy isolation, padlock application, and zero-energy verification.',
            },
            {
              id: 'opt-4',
              text: 'Yes, provided the hydraulic motor is turned off.',
              isCorrect: false,
              explanation:
                'Incorrect. Even if the pump is off, hydraulic accumulators hold high residual pressure that can cause roll movement until bled.',
            },
          ],
          standardReference:
            'OSHA 1910.147 / Welspun Life-Saving Rule #2: Energy Isolation',
        },
        practicalTakeaway:
          'One person, one lock, one key. Never trust control switches for body protection.',
      },
      {
        id: 'scene-4-reporting',
        number: 4,
        title: 'Incident Reporting & Near-Miss Escalation',
        subtitle:
          'Proactive Hazard Identification & Zero-Retaliation Reporting',
        story:
          'While walking past the hydrostatic tester transfer conveyor, an operator notices a high-pressure hydraulic flex hose weeping fluid onto the concrete floor near an electrical conduit. Nobody has slipped or been hurt yet.',
        diagramType: 'near_miss',
        explanations: {
          eli5: {
            title: 'Fixing the Loose Rug Before Someone Trips',
            analogy:
              'If you see a slippery puddle or a loose rug at home, you don’t just walk past it and wait for your grandmother to trip and break her hip. You wipe up the water and fix the rug immediately! Reporting a small problem today stops a giant disaster tomorrow.',
            body: 'A near-miss is a free warning from the universe. When we spot something unsafe and speak up right away, we fix it before anyone gets hurt.',
          },
          operator: {
            title: 'Near-Miss Action Steps',
            checkpoints: [
              '1. Make the area safe immediately: place a caution cone, barricade, or spill absorbent pad.',
              '2. Notify the area supervisor verbally.',
              '3. Log the near-miss on the digital safety kiosk or mobile app within the same shift.',
              '4. Confirm the maintenance work order is assigned and tracked to completion.',
            ],
            cues: [
              'Noticeable physical changes: leaking fluids, damaged cables, loose railings, missing machine guards.',
              'Immediate containment: absorbent boom around liquid spill.',
              'Work order number issued for permanent mechanical repair.',
            ],
            warnings:
              'ZERO RETALIATION: Welspun has a strict zero-retaliation policy. Reporting safety hazards or near-misses is rewarded and commended.',
          },
          engineer: {
            title: 'Leading vs. Lagging Safety Indicators',
            specifications:
              'Heinrich’s Safety Triangle: for every 1 major fatal accident, there are approximately 29 minor injuries and 300 near-miss incidents. Proactive near-miss reporting drives the leading indicators that eliminate catastrophic failures.',
            parameters: {
              'Reporting Timeframe':
                'Within 2 hours of observation (same shift)',
              'Supervisor Review SLA':
                'Initial risk assessment within 24 hours',
              'Resolution Verification':
                'Safety officer sign-off upon physical fix completion',
              'Investigation Threshold':
                'Potential High-Severity Events (pSIF) require formal 5-Why root cause',
            },
            standards: [
              'ISO 45001 Clause 10.2 Incident Management',
              'OSHA Recordkeeping 1904',
            ],
            technicalNote:
              'Near-miss trend analysis identifies recurring mechanical degradation patterns (e.g. hose fatigue, loose crane festoon cables) before systemic failures occur.',
          },
        },
        quiz: {
          question:
            'You find an oily slick on the walkway near the pipe flattener. Nobody has fallen. What is the proper procedure?',
          context:
            'You are halfway through your shift and have production targets to meet.',
          options: [
            {
              id: 'opt-1',
              text: 'Walk around it; maintenance will probably see it during their weekly sweep.',
              isCorrect: false,
              explanation:
                'Incorrect. Leaving a known hazard unaddressed invites the next passing employee to slip, fall, and sustain injury.',
            },
            {
              id: 'opt-2',
              text: 'Throw a piece of cardboard over the oil so nobody sees it.',
              isCorrect: false,
              explanation:
                'Incorrect. Cardboard absorbs oil and becomes an even more dangerous, hidden slip hazard.',
            },
            {
              id: 'opt-3',
              text: 'Place a hazard cone, contain the oil with absorbent pads, and file a Near-Miss report so the leak gets repaired.',
              isCorrect: true,
              explanation:
                'Correct! Immediate containment protects your coworkers, and filing the near-miss report ensures the root mechanical oil leak is repaired by maintenance before someone gets hurt.',
            },
            {
              id: 'opt-4',
              text: 'Only report it if someone actually falls and needs medical attention.',
              isCorrect: false,
              explanation:
                'Incorrect. Waiting for an actual injury before reporting defeats the entire purpose of proactive safety culture.',
            },
          ],
          standardReference:
            'Welspun Incident Reporting & Near-Miss Guideline SAF-04',
        },
        practicalTakeaway:
          'Every near-miss is a lesson before an injury. Report hazards immediately to protect your team.',
      },
    ],
  },
  {
    id: 'quality-basics-103',
    code: 'QAL-INSP-01',
    title: 'Quality Inspection Basics',
    subtitle: 'Standards, Defect Detection & Traceability Governance',
    description:
      'Learn the foundations of certified manufacturing quality: quality gate checkpoints, weld defect classification, heat number traceability, and non-conformance quarantine decisions.',
    category: 'Quality & Compliance',
    estimatedMinutes: 15,
    badgeLabel: 'Quality Control',
    thumbnailType: 'quality_stamp',
    scenes: [
      {
        id: 'scene-1-checkpoints',
        number: 1,
        title: 'Inspection Checkpoints & Sampling Intervals',
        subtitle: 'Quality Gates, Gauge Calibration & Frequency Control',
        story:
          'In API 5L linepipe production, quality is verified at predetermined inspection gates: incoming raw coil, continuous strip milling, helical welding, hydrostatic proof testing, ultrasonic testing, and final release. Every measuring tool must carry a valid calibration sticker.',
        diagramType: 'inspection_gates',
        explanations: {
          eli5: {
            title: 'Multiple Airport Security Checkpoints',
            analogy:
              'Think of airport security. You don’t just check tickets once at the curb—you show ID at the entrance, put bags through the X-ray, walk through the metal detector, and show your boarding pass at the gate. Each step checks something different so nothing dangerous ever gets onto the airplane!',
            body: 'At the pipe mill, we have 6 inspection gates. Checking the pipe at every step means if anything is slightly off, we catch it right away instead of waiting until the end.',
          },
          operator: {
            title: 'Shift Start Quality Tool Check',
            checkpoints: [
              'Inspect calibration sticker on calipers, micrometers, and ultrasonic thickness gauges: verify expiration date has not passed.',
              'Perform zero-point check on micrometers against calibrated gauge blocks.',
              'Verify inspection log sheets are loaded with the correct client specification and tolerance limits.',
              'Record physical measurements at mandated intervals: measure wall thickness at 4 quadrants on every 10th pipe.',
            ],
            cues: [
              'Valid green calibration sticker with intact tamper seal.',
              'Exact zero reading when caliper jaws are closed.',
              'Readings recorded into the digital Quality Management System (QMS) in real time.',
            ],
            warnings:
              'NEVER use an uncalibrated, damaged, or expired measuring instrument. Doing so invalidates all production quality records.',
          },
          engineer: {
            title: 'Quality Assurance Architecture (API Q1 / ISO 9001)',
            specifications:
              'Inspection and Test Plan (ITP) compliance under API Spec Q1 and ISO 9001. Statistical Process Control (SPC) charts track outer diameter roundness, wall thickness distribution (Cp, Cpk > 1.33), and weld reinforcement dimensions.',
            parameters: {
              'Gauge Calibration Interval':
                '6 months per ISO/IEC 17025 accredited laboratory',
              'Diameter Tolerance':
                '± 0.5% of nominal pipe outer diameter (API 5L Table 10)',
              'Wall Thickness Tolerance':
                '+ 15% / - 12.5% of nominal wall thickness',
              'Ovality Limit': '<= 0.5% ([Dmax - Dmin] / Dnominal)',
            },
            standards: [
              'API Spec Q1 Quality Management',
              'ISO 9001:2015',
              'API Spec 5L Section 10',
            ],
            technicalNote:
              'Instrument calibration records are maintained in the electronic document control system with complete measurement uncertainty budgets.',
          },
        },
        quiz: {
          question:
            'Your digital micrometer has a calibration sticker that expired yesterday, but it reads zero when closed and looks clean. Can you use it for the morning inspection run?',
          context: 'The tool crib is at the far end of the plant building.',
          options: [
            {
              id: 'opt-1',
              text: 'Yes, as long as it reads zero when closed.',
              isCorrect: false,
              explanation:
                'Incorrect. Reading zero does not verify linearity, accuracy across the measurement range, or anvil parallelism.',
            },
            {
              id: 'opt-2',
              text: 'No. Using an expired tool invalidates quality certifications; you must replace it immediately with a calibrated tool from the tool crib.',
              isCorrect: true,
              explanation:
                'Correct! Under API Spec Q1 and ISO 9001, any measurement taken with an instrument whose calibration interval has expired is legally invalid. If an audit reveals expired tools were used, every pipe measured with that tool can be rejected by the customer.',
            },
            {
              id: 'opt-3',
              text: 'Yes, but apply a manual 5% correction factor to your notes.',
              isCorrect: false,
              explanation:
                'Incorrect. Operators cannot invent arbitrary correction factors. All instruments must have documented calibration traceability.',
            },
            {
              id: 'opt-4',
              text: 'Yes, but only for the first two pipes of the shift.',
              isCorrect: false,
              explanation:
                'Incorrect. Quality standards apply to every pipe without exception.',
            },
          ],
          standardReference:
            'API Spec Q1 Section 5.8: Control of Testing and Measuring Equipment',
        },
        practicalTakeaway:
          'Never measure with an expired tool. Calibration validity is the foundation of certified quality.',
      },
      {
        id: 'scene-2-defects',
        number: 2,
        title: 'Defect Awareness & Classification',
        subtitle: 'Weld & Base Metal Defects: Porosity, Undercut & LOP',
        story:
          'Quality inspectors must recognize and classify weld and metal imperfections: undercut, porosity clusters, lack of penetration (LOP), lack of fusion, slag inclusions, and base metal laminations. Critical planar defects have zero tolerance in high-pressure oil and gas pipelines.',
        diagramType: 'defect_types',
        explanations: {
          eli5: {
            title: 'Spotting Cracks and Air Bubbles',
            analogy:
              'If you are building a bridge out of stone blocks, you inspect each block carefully. If a block has deep cracks or large air bubbles inside, it will crack under heavy truck traffic! At the pipe plant, we inspect the steel and welds to make sure there are zero weak spots.',
            body: 'Some minor surface scratches can be gently polished away, but hidden cracks or deep grooves in the weld can cause a pipeline to fail. We catch them before they ever leave the factory.',
          },
          operator: {
            title: 'Weld Inspection & Visual Identification',
            checkpoints: [
              'Inspect weld bead crown for uniform width and smooth transition into base metal.',
              'Check for undercut: grooves along the edge of the weld bead toe must not exceed 0.5 mm in depth.',
              'Verify absence of surface porosity, pinholes, or crater cracks.',
              'Inspect base metal adjacent to weld for arc strikes or heavy mechanical gouges.',
            ],
            cues: [
              'Smooth, continuous ripple pattern without sharp valleys or notches.',
              'Clean metallic luster without dark slag trapped in the weld toe.',
              'Consistent bead height between 0.5 mm and 3.0 mm above pipe surface.',
            ],
            warnings:
              'REJECTABLE DEFECT: Planar defects like cracks or lack of fusion have ZERO allowable tolerance under API 5L.',
          },
          engineer: {
            title: 'Fracture Mechanics & Defect Acceptance Criteria',
            specifications:
              'Defect acceptance limits defined by API 5L Annex E and ISO 3183. Undercut creates a severe stress concentration factor (Kt > 3.0) that accelerates fatigue crack initiation under cyclic pipeline pressurization.',
            parameters: {
              'Maximum Allowable Undercut Depth':
                '0.5 mm (or 0.8 mm if length < 50 mm)',
              'Individual Porosity Pore Limit': 'Maximum 3.0 mm diameter',
              'Cumulative Porosity Limit':
                '<= 6.0 mm in any 100 mm of weld length',
              'Planar Defects (Cracks, Lack of Fusion)':
                'ZERO tolerance (immediate reject)',
            },
            standards: [
              'API Spec 5L Annex E',
              'ISO 3183 Annex G',
              'ASME Section IX QW-190',
            ],
            technicalNote:
              'Engineering Critical Assessment (ECA) per BS 7910 evaluates whether volumetric flaws affect structural integrity, but planar flaws mandate repair or crop cut.',
          },
        },
        quiz: {
          question:
            'During visual inspection of the outer weld cap, you detect a sharp continuous groove (undercut) along the weld toe measuring 1.2 mm deep over a length of 150 mm. How do you classify this?',
          context:
            'API 5L specifies maximum undercut depth of 0.5 mm for continuous defects.',
          options: [
            {
              id: 'opt-1',
              text: 'Acceptable cosmetic imperfection that does not require action.',
              isCorrect: false,
              explanation:
                'Incorrect. A 1.2 mm deep undercut is more than double the maximum allowable limit of 0.5 mm.',
            },
            {
              id: 'opt-2',
              text: 'Minor flaw that will be concealed by the external 3LPE coating.',
              isCorrect: false,
              explanation:
                'Incorrect. Concealing a structural notch under coating creates a dangerous hidden failure point when the pipe is pressurized in the field.',
            },
            {
              id: 'opt-3',
              text: 'Critical rejectable defect exceeding API 5L limits; mark the pipe and initiate an approved weld repair procedure.',
              isCorrect: true,
              explanation:
                'Correct! Undercut deeper than 0.5 mm creates a severe stress riser that can trigger fatigue cracking under operating pipeline pressures. It exceeds acceptance criteria and requires marking, mechanical grinding/gouging, re-welding per approved procedure, and 100% NDT re-inspection.',
            },
            {
              id: 'opt-4',
              text: 'Normal variation that will smooth out during hydrostatic testing.',
              isCorrect: false,
              explanation:
                'Incorrect. Hydrostatic testing stresses the pipe; it does not heal or smooth out sharp geometric weld defects.',
            },
          ],
          standardReference:
            'API Spec 5L Section 9.10 / Defect Catalogue QC-DEF-02',
        },
        practicalTakeaway:
          'Smooth weld transitions prevent fatigue failure. Sharp notches and cracks are strictly unacceptable.',
      },
      {
        id: 'scene-3-traceability',
        number: 3,
        title: 'Traceability & Heat Number Lineage',
        subtitle: 'From Ladle Chemical Heat to Final Pipe Serial Number',
        story:
          'Every single pipe manufactured carries an unbroken lineage tracing back to the original steel ladle heat, chemical composition, coil roll date, welding machine operator, and test charts. If a pipe in a transcontinental pipeline needs verification 30 years from now, its pedigree must be instantly retrievable.',
        diagramType: 'traceability_lineage',
        explanations: {
          eli5: {
            title: 'The Steel Pipe’s Birth Certificate and Family Tree',
            analogy:
              'Just like your birth certificate lists your parents, birthdate, and hospital, every pipe has a family tree stamped onto it. If someone asks 20 years from now: "What metal was used in this pipe?", we can look up the number and tell them the exact day and recipe it was melted!',
            body: 'Traceability means we never lose track of which steel went into which pipe. This protects everyone when building high-pressure oil and water lifelines across cities.',
          },
          operator: {
            title: 'Traceability Verification Steps',
            checkpoints: [
              'Verify internal pipe end low-stress hard stamp matches the physical traveler card before hydro testing.',
              'Ensure computerized pipe stenciler applies clean, legible white text on pipe outer diameter.',
              'Scan pipe barcode at each transfer station to record electronic production tracking.',
              'If stencil is smeared or unreadable, halt pipe transfer and apply permanent manual paint stencil.',
            ],
            cues: [
              'Clear, sharp dot-matrix impressions on pipe interior end.',
              'Continuous line tracking status updated in the factory MES system.',
              'Zero discrepancies between physical pipe number and digital database record.',
            ],
            warnings:
              'NEVER guess or invent a pipe number. If identity is ever ambiguous, quarantine the pipe immediately until hard stamp verification is completed.',
          },
          engineer: {
            title: 'Material Test Report (MTR) & EN 10204 Type 3.1 Lineage',
            specifications:
              'Material Test Reports (MTR) certified in accordance with EN 10204 Type 3.1. Complete 1-to-1 digital correlation between pipe serial number, coil ID, mother heat chemistry (C, Mn, Si, P, S, Cr, Mo, V, Nb, Ti, N), mechanical tensile properties, and Charpy impact energy values.',
            parameters: {
              'Certification Level': 'EN 10204 Type 3.1 Inspection Certificate',
              'Traceability Retention':
                'Minimum 25 years digital archive with offsite redundancy',
              'Internal Hard Stamp':
                'Low-stress round-nose dot matrix (depth 0.2 - 0.5 mm)',
              'External Body Stencil':
                'UV-resistant weatherproof white polyurethane ink',
            },
            standards: [
              'EN 10204 Inspection Documents',
              'API Spec 5L Section 11 Marking',
              'ISO 10474',
            ],
            technicalNote:
              'Electronic tracking utilizes 2D DataMatrix and RFID tags on pipe transport racks to maintain automated FIFO flow and real-time genealogy reconciliation.',
          },
        },
        quiz: {
          question:
            'A pipe arrives at final inspection with its external stencil smeared by cooling water, and the paper barcode label is torn off. How should you verify the pipe identity?',
          context:
            'Two identical-looking pipes are sitting side-by-side on the inspection rack.',
          options: [
            {
              id: 'opt-1',
              text: 'Guess the serial number based on the previous pipe in the rack sequence (+1).',
              isCorrect: false,
              explanation:
                'Incorrect. Never guess serial numbers. If the sequence skipped a pipe due to testing delays, guessing assigns the wrong metallurgical pedigree.',
            },
            {
              id: 'opt-2',
              text: 'Locate the permanent low-stress hard stamp inside the pipe end, verify it against the line tracking MES system, and re-stencil.',
              isCorrect: true,
              explanation:
                'Correct! The permanent low-stress hard stamp applied inside the pipe end prior to hydrostatic testing is the authoritative physical source of truth. Verifying this hard stamp against the digital MES traveler restores verified traceability.',
            },
            {
              id: 'opt-3',
              text: 'Assign a brand-new number from the end of the batch to keep the conveyor moving.',
              isCorrect: false,
              explanation:
                'Incorrect. Assigning arbitrary new serial numbers severs the link to the actual steel heat and hydrostatic test certificate.',
            },
            {
              id: 'opt-4',
              text: 'Ship the pipe without a stencil and let the customer identify it on site.',
              isCorrect: false,
              explanation:
                'Incorrect. Unmarked pipes cannot be accepted by clients and will be rejected at destination ports.',
            },
          ],
          standardReference:
            'Welspun Traceability Standard SOP-TRAC-02 / API 5L Clause 11',
        },
        practicalTakeaway:
          'Hard stamps and digital lineage protect traceability. Never guess a serial number.',
      },
      {
        id: 'scene-4-quarantine',
        number: 4,
        title: 'Quality Release Decisions & Quarantine',
        subtitle: 'Non-Conformance Reports (NCR) & Material Review Board (MRB)',
        story:
          'When an automated ultrasonic inspection flags an internal weld flaw or hydro test records an anomalous pressure drop, production must instantly stop for that pipe. The pipe is flagged, diverter arms push it into the designated physical quarantine bay, and red HOLD tags are locked in place until formal disposition.',
        diagramType: 'quarantine_ncr',
        explanations: {
          eli5: {
            title: 'The Red Tag Quarantine Bay',
            analogy:
              'If a doctor suspects a patient has a contagious fever, they don’t let them walk around the office—they take them to a quiet examination room for tests. If a pipe shows even a hint of a flaw, we put bright red "HOLD" tags on both ends and roll it into a locked quarantine area so nobody can touch it by mistake.',
            body: 'Only the senior quality specialists have the special keys to release a quarantined pipe after it has been properly repaired or verified.',
          },
          operator: {
            title: 'Quarantine Action Protocol',
            checkpoints: [
              '1. Immediately trigger the reject diverter kicker to route pipe into the quarantine holding rack.',
              '2. Affix prominent red "REJECTED / HOLD - DO NOT MOVE" tags to both ends of the pipe.',
              '3. Log the pipe serial number and defect description into the electronic Non-Conformance Report (NCR) system.',
              '4. Confirm red quarantine status lights illuminate above the quarantine rack.',
            ],
            cues: [
              'Physical red tags visible from 10 meters away on both pipe ends.',
              'Electronic lock engaged in MES: pipe serial number blocked from release stenciling.',
              'Pipe physically segregated behind yellow-and-black chain barrier.',
            ],
            warnings:
              'ABSOLUTE RULE: No operator or production supervisor has authority to remove a red Quarantine tag. Only authorized Quality Assurance personnel can sign off an NCR disposition.',
          },
          engineer: {
            title: 'Non-Conformance Control & Disposition Protocol',
            specifications:
              'Control of Non-conforming Product per API Spec Q1 Section 5.8 and ISO 9001 Clause 8.7. Segregation prevents unintended shipment of non-conforming items. Material Review Board (MRB) evaluates engineering dispositions.',
            parameters: {
              'Disposition Options':
                '1) Approved Repair (WPS-R), 2) Crop Cut to Shorter Length, 3) Down-grade, 4) Scrap',
              'Repair Re-Testing Requirement':
                '100% UT re-inspection plus 100% digital radiographic testing of repair area',
              'Quarantine Audit SLA':
                'All open NCRs audited every 24 hours during daily QA shift handover',
              'MRB Authority':
                'Quality Assurance Manager and Plant Technical Director co-sign mandatory',
            },
            standards: [
              'API Spec Q1 Section 5.8',
              'ISO 9001:2015 Clause 8.7 Non-conforming Outputs',
            ],
            technicalNote:
              'A maximum of two weld repairs are permitted in any single pipe joint per API 5L Clause 9.11. If a second repair fails NDT, the pipe must be cropped or scrapped.',
          },
        },
        quiz: {
          question:
            'A production shift supervisor tells you to remove a red Quarantine tag from a pipe with a minor UT flaw so it can be loaded onto an urgent transport truck to meet the shift quota. What should you do?',
          context: 'The truck driver is waiting at the dispatch bay.',
          options: [
            {
              id: 'opt-1',
              text: 'Remove the tag immediately because the shift supervisor is in charge of production operations.',
              isCorrect: false,
              explanation:
                'Incorrect. Production hierarchy cannot overrule quality quarantine. Unauthorized release of quarantined goods is a severe compliance violation.',
            },
            {
              id: 'opt-2',
              text: 'Maintain the quarantine, refuse to remove the tag, and immediately escalate the situation to the Quality Assurance Manager.',
              isCorrect: true,
              explanation:
                'Correct! Quality quarantine holds are absolute and legally protected. Under API Spec Q1, only authorized Quality Assurance personnel can approve NCR dispositions and release quarantined product. Production schedules never override quality integrity.',
            },
            {
              id: 'opt-3',
              text: 'Take the tag off but write a private warning note to the truck driver.',
              isCorrect: false,
              explanation:
                'Incorrect. Warning the driver does not fix or verify the defective pipeline weld.',
            },
            {
              id: 'opt-4',
              text: 'Hide the pipe in the back of the yard until next week.',
              isCorrect: false,
              explanation:
                'Incorrect. Hiding quarantined material prevents formal MRB investigation and repair.',
            },
          ],
          standardReference:
            'API Spec Q1 Section 5.8 / Welspun Quality Governance Charter',
        },
        practicalTakeaway:
          'Quality hold is absolute. Only authorized QA personnel can release quarantined material.',
      },
    ],
  },
];
