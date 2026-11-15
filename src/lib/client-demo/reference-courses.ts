import type { CourseData } from './types';

// Adapted from the supplied Welspun Learning Portal; the third course groups its six labs.
export const REFERENCE_COURSES: CourseData[] = [
  {
    id: 'coat',
    code: 'REF-COAT-01',
    title: 'coating application External & Internal',
    sourcePdf: '/learning/coating-application-external-internal.pdf',
    subtitle:
      'Coating operations, holiday inspection, offline testing and final inspection',
    description:
      'One pipe, from the receiving bay to the dispatch yard. Sixteen stops, outside coating first, then the inside. At each stop you read it in short parts, look at the real equipment, and make the call an inspector makes.',
    category: 'Manufacturing Process',
    estimatedMinutes: 150,
    badgeLabel: 'Reference course',
    thumbnailType: 'pipe_process',
    scenes: [
      {
        id: 'c1',
        number: 1,
        title: 'Why a pipe needs a coat',
        subtitle: 'PURPOSE AND TYPES',
        story:
          'Pipe #W-0417 is bare steel. Buried in soil and water, steel rusts. The coating has one job: keep every corrosive element away from the steel. Everything you will see on this line, from the first wash to the last stencil, exists to make that coat hold.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c1',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Think of a raincoat. A raincoat with a hole lets the rain in. For a buried pipe, “rain” is soil and water. The coating is called failed the moment either one reaches the steel.',
            body: 'A coating is failed if any soil or water makes contact with the pipe steel.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Your station either protects the next one or damages it. A coating can only stick to steel that is clean and rough, and it only protects if it is unbroken. That is why surface preparation and testing get as much attention as the coating itself.',
              'Coating families: 3LPE/3LPP, FBE/DFBE, CWC',
              'Test of failure: soil or water touching steel',
              'Backstop: cathodic protection (CP)',
            ],
            cues: [
              'A coating is failed if any soil or water makes contact with the pipe steel.',
            ],
            warnings:
              'The deck labels “CWC Coating” without expanding it. Confirm the wording (commonly concrete weight coating). The one-line job of the adhesive layer is inferred from its position between epoxy and topcoat. Confirm with TCoE.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'The deck names three coating families: LPE/LPP (three-layer polyethylene or polypropylene), FBE (fusion bonded epoxy), and CWC. Some degree of coating failure is unavoidable over a pipeline’s life, and cathodic protection (CP) is a cost-effective answer. A low level of defects with a fully effective CP system is a normal, acceptable condition for most operators.',
            parameters: {
              'Coating families': '3LPE/3LPP, FBE/DFBE, CWC',
              'Test of failure': 'soil or water touching steel',
              Backstop: 'cathodic protection (CP)',
            },
            standards: ['deck p.2, p.22, p.23'],
            technicalNote:
              'Of the six causes, application is the one this plant owns. That is why the rest of the course follows the pipe through every step that makes the coat hold.',
          },
        },
        quiz: {
          question:
            'Over a pipeline’s life, some coating damage is found and the CP system is working fully. What does the deck say about this situation?',
          context:
            'Pipe #W-0417 is bare steel. Buried in soil and water, steel rusts. The coating has one job: keep every corrosive element away from the steel. Everything you will see on this line, from the first wash to the last stencil, exists to make that coat hold.',
          options: [
            {
              id: 'option-0',
              text: 'Unacceptable: any defect means the pipe must be replaced',
              isCorrect: false,
              explanation:
                'The deck states that some degree of coating failure is unavoidable, that CP is a cost-effective solution, and that a low level of defects with a fully effective CP system is a normal, acceptable condition. That is not a licence for defects: the plant’s job is to keep the starting condition as clean as possible.',
            },
            {
              id: 'option-1',
              text: 'Normal and acceptable for most operators, because some failure is unavoidable and CP covers it',
              isCorrect: true,
              explanation:
                'The deck states that some degree of coating failure is unavoidable, that CP is a cost-effective solution, and that a low level of defects with a fully effective CP system is a normal, acceptable condition. That is not a licence for defects: the plant’s job is to keep the starting condition as clean as possible.',
            },
            {
              id: 'option-2',
              text: 'It proves the coating was badly applied at the plant',
              isCorrect: false,
              explanation:
                'The deck states that some degree of coating failure is unavoidable, that CP is a cost-effective solution, and that a low level of defects with a fully effective CP system is a normal, acceptable condition. That is not a licence for defects: the plant’s job is to keep the starting condition as clean as possible.',
            },
          ],
          standardReference: 'deck p.2, p.22, p.23',
        },
        practicalTakeaway:
          'A coating is failed if any soil or water makes contact with the pipe steel.',
      },
      {
        id: 'c2',
        number: 2,
        title: 'Arrival and the hot wash',
        subtitle: 'RECEIVING INSPECTION AND WATER WASH',
        story:
          'The pipe is checked at receiving inspection, then rolls into a high pressure hot water wash. The wash takes off what blasting would otherwise have to fight: loose dust, mud, soluble salts and chlorides. An air knife wipes the water off before the pipe moves on.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c2',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A car wash before a paint job. You rinse the mud and salt off first, then dry it, so the real preparation starts on a clean surface.',
            body: 'Optional on the chart means “as the project specification requires”, not “skip when busy”.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Both flow charts open with receiving inspection, then water wash, which is marked optional (*). Optional means the project specification decides, so check the order before you assume the step is on or off. The same chart shows the NTC re-process loop returning here.',
              'Spray pressure: up to 100 bar',
              'Water temperature: up to 70 °C (if required)',
              'Removes: dust, mud, soluble salts, chlorides',
              'Drying: compressed-air knife',
            ],
            cues: [
              'Optional on the chart means “as the project specification requires”, not “skip when busy”.',
            ],
            warnings:
              'The deck gives no detail for receiving inspection. Add the checks (documents, surface condition, identification) from the ITP. Confirm that the air knife and wash stage have no recorded limits beyond those on the slide.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Spray pressure up to 100 bar, water up to 70 °C if required. The machine is by Initech, S Korea. A high pressure dry compressed-air knife is attached to wipe excess water from the pipe surface. Water wash is optional on both the 3LPE/3LPP and the FBE/DFBE chart.',
            parameters: {
              'Spray pressure': 'up to 100 bar',
              'Water temperature': 'up to 70 °C (if required)',
              Removes: 'dust, mud, soluble salts, chlorides',
              Drying: 'compressed-air knife',
            },
            standards: ['deck p.4, p.5, p.6'],
            technicalNote:
              'Learn to read the asterisk. Two charts, two different optional lists.',
          },
        },
        quiz: {
          question:
            'Looking at the two flow charts, which early station is marked optional on BOTH the 3LPE/3LPP chart and the FBE/DFBE chart?',
          context:
            'The pipe is checked at receiving inspection, then rolls into a high pressure hot water wash. The wash takes off what blasting would otherwise have to fight: loose dust, mud, soluble salts and chlorides. An air knife wipes the water off before the pipe moves on.',
          options: [
            {
              id: 'option-0',
              text: 'Receiving inspection',
              isCorrect: false,
              explanation:
                'Water wash carries the asterisk on both charts. Preheating is starred only on the 3LPE/3LPP chart; on the FBE/DFBE chart it is a standard station. The footnote on both says optional stations apply as per project specification requirements.',
            },
            {
              id: 'option-1',
              text: 'Water wash',
              isCorrect: true,
              explanation:
                'Water wash carries the asterisk on both charts. Preheating is starred only on the 3LPE/3LPP chart; on the FBE/DFBE chart it is a standard station. The footnote on both says optional stations apply as per project specification requirements.',
            },
            {
              id: 'option-2',
              text: 'Preheating',
              isCorrect: false,
              explanation:
                'Water wash carries the asterisk on both charts. Preheating is starred only on the 3LPE/3LPP chart; on the FBE/DFBE chart it is a standard station. The footnote on both says optional stations apply as per project specification requirements.',
            },
          ],
          standardReference: 'deck p.4, p.5, p.6',
        },
        practicalTakeaway:
          'Optional on the chart means “as the project specification requires”, not “skip when busy”.',
      },
      {
        id: 'c3',
        number: 3,
        title: 'Preheat: dry before you blast',
        subtitle: 'GAS OVEN',
        story:
          'The pipe enters a gas oven that sits right before the blast machines. Seven radiation burners warm the steel so any wetness is gone before abrasive hits it. Pyrometers watch the temperature all the time.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c3',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Dry skin takes tape; wet skin does not. The oven dries the steel so the next step can work.',
            body: 'The oven’s job is to remove wetness before blast cleaning.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Check the pyrometer display at the oven. The steel is raised up to 85 °C, using LPG or natural gas as fuel. The point is a surface free from moisture, not a hot pipe for its own sake.',
              'Burners: 7 × 500 kW',
              'Throughput: 125 MT/hr',
              'Steel temperature: up to 85 °C',
              'Fuel: LPG or natural gas',
              'Monitoring: radiation pyrometers',
            ],
            cues: [
              'The oven’s job is to remove wetness before blast cleaning.',
            ],
            warnings:
              'The deck writes the oven capacity as “3500 KWH”. Confirm the unit (kW). Preheating is optional on the 3LPE/3LPP chart. Confirm when it is applied.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Seven radiation burners of 500 kW each (the deck states a total of 3500 KWH, written as an energy unit; read as 3500 kW). Capability to preheat 125 MT per hour, raising steel up to 85 °C. Constant monitoring with radiation pyrometers.',
            parameters: {
              Burners: '7 × 500 kW',
              Throughput: '125 MT/hr',
              'Steel temperature': 'up to 85 °C',
              Fuel: 'LPG or natural gas',
              Monitoring: 'radiation pyrometers',
            },
            standards: ['deck p.6'],
            technicalNote:
              'Two temperatures, two stations: up to 85 °C here, about 250 °C at induction heating. Do not mix them up.',
          },
        },
        quiz: {
          question:
            'What is the purpose of the gas oven before the blast machines?',
          context:
            'The pipe enters a gas oven that sits right before the blast machines. Seven radiation burners warm the steel so any wetness is gone before abrasive hits it. Pyrometers watch the temperature all the time.',
          options: [
            {
              id: 'option-0',
              text: 'To cure the epoxy',
              isCorrect: false,
              explanation:
                'The deck states the oven removes any wetness and makes the surface free from moisture before blast cleaning. The 250 °C figure belongs to the induction heater much later in the line.',
            },
            {
              id: 'option-1',
              text: 'To remove wetness so the surface is free from moisture before blast cleaning',
              isCorrect: true,
              explanation:
                'The deck states the oven removes any wetness and makes the surface free from moisture before blast cleaning. The 250 °C figure belongs to the induction heater much later in the line.',
            },
            {
              id: 'option-2',
              text: 'To bring the pipe to 250 °C',
              isCorrect: false,
              explanation:
                'The deck states the oven removes any wetness and makes the surface free from moisture before blast cleaning. The 250 °C figure belongs to the induction heater much later in the line.',
            },
          ],
          standardReference: 'deck p.6',
        },
        practicalTakeaway:
          'The oven’s job is to remove wetness before blast cleaning.',
      },
      {
        id: 'c4',
        number: 4,
        title: 'Blasting: clean and rough',
        subtitle: 'ABRASIVE BLASTING',
        story:
          'Pipe #W-0417 enters the blast machines. Steel grit hurled at 80 metres a second strips away contamination and leaves the surface rough, so the coating has something to grip. It happens in two stages, with two blast wheels in each.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c4',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Sandpaper on a wall before painting. Smooth and dirty will not hold paint. Clean and slightly rough will.',
            body: 'Cleanliness Sa2½ to Sa3 and anchor pattern 50 to 110 µm. The next station measures both.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Two things matter at this station: how clean (Sa2½ to Sa3) and how rough (anchor pattern 50 to 110 microns). The grit is screened all the time and fine dust is pulled out by bag-house collectors, so the pipe and the abrasive stay dust-free.',
              'Cleanliness: Sa2½ to Sa3 (ISO 8501-1)',
              'Anchor pattern: 50 to 110 µm',
              'Stages: 2 sets, 2 wheels each',
              'Throw velocity: 80 m/s',
              'Capacity: 600 m²/hr each, over 800 combined',
              'Abrasive: steel grit GP18/25/40 or shot S280/S330',
            ],
            cues: [
              'Cleanliness Sa2½ to Sa3 and anchor pattern 50 to 110 µm. The next station measures both.',
            ],
            warnings:
              'Air blow out has no detail in the deck. Add its purpose and check, if any. Confirm how the abrasive mix is chosen for a given order.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Two sets for stage blast cleaning, two blast wheels each, 20 in × 5 in wheels, throwing velocity 80 m/s. Individual capacity 600 m² per hour, combined over 800 m² per hour. Abrasive may be steel grit GP18, GP25, GP40 or steel shot S280, S330 as necessary. Automated continuous grit screening with air wash for fines removal.',
            parameters: {
              Cleanliness: 'Sa2½ to Sa3 (ISO 8501-1)',
              'Anchor pattern': '50 to 110 µm',
              Stages: '2 sets, 2 wheels each',
              'Throw velocity': '80 m/s',
              Capacity: '600 m²/hr each, over 800 combined',
              Abrasive: 'steel grit GP18/25/40 or shot S280/S330',
            },
            standards: ['deck p.7'],
            technicalNote:
              '“Air blow out” follows blasting on the flow chart. It has no slide, so ask what it does and how it is checked.',
          },
        },
        quiz: {
          question:
            'Which pair describes what external blasting must deliver, according to the deck?',
          context:
            'Pipe #W-0417 enters the blast machines. Steel grit hurled at 80 metres a second strips away contamination and leaves the surface rough, so the coating has something to grip. It happens in two stages, with two blast wheels in each.',
          options: [
            {
              id: 'option-0',
              text: 'Sa1 to Sa2 and 10 to 50 µm',
              isCorrect: false,
              explanation:
                'The deck states Sa2½ to Sa3 against ISO 8501-1 and an anchor pattern of 50 to 110 microns. The next station inspects exactly these two things.',
            },
            {
              id: 'option-1',
              text: 'Sa2½ to Sa3 and 50 to 110 µm',
              isCorrect: true,
              explanation:
                'The deck states Sa2½ to Sa3 against ISO 8501-1 and an anchor pattern of 50 to 110 microns. The next station inspects exactly these two things.',
            },
            {
              id: 'option-2',
              text: 'Sa3 only and 200 µm',
              isCorrect: false,
              explanation:
                'The deck states Sa2½ to Sa3 against ISO 8501-1 and an anchor pattern of 50 to 110 microns. The next station inspects exactly these two things.',
            },
          ],
          standardReference: 'deck p.7',
        },
        practicalTakeaway:
          'Cleanliness Sa2½ to Sa3 and anchor pattern 50 to 110 µm. The next station measures both.',
      },
      {
        id: 'c5',
        number: 5,
        title: 'The blast gate',
        subtitle: 'BLASTED SURFACE INSPECTION',
        story:
          'This is where the pipe can be stopped. An inspector compares it with the rust-grade book, measures its roughness, checks for salt and dust, and looks for steel or surface defects. OK goes to the coating line. NOT OK takes the NTC re-process route back to receiving inspection.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c5',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Like a pre-flight check. If any item fails, the plane does not take off, and it goes back to be fixed.',
            body: 'NOT OK is not scrap. It is the re-process route, and the pipe runs surface preparation again.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Five checks, all must pass: visual cleanliness (Sa2½ to Sa3 against ISO 8501-1 and SSPC-VIS 1 photographs), anchor profile with the digital roughness gauge, salt contamination with the meter, dust degree per ISO 8502-3, and other surface defects.',
              'Cleanliness: Sa2½ to Sa3, visual',
              'Anchor profile: 50 to 110 µm',
              'Salt: measured with meter',
              'Dust: ISO 8502-3 (1 to 5 chart)',
              'NOT OK: NTC re-process',
            ],
            cues: [
              'NOT OK is not scrap. It is the re-process route, and the pipe runs surface preparation again.',
            ],
            warnings:
              'The deck gives no acceptance limit for salt contamination or dust level. Add the specified limits from the ITP. Confirm how the NTC route is recorded (traveller, SAP entry).',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Reference tools shown in the deck: the ISO 8501-1:2007 rust-grade book, SSPC-VIS 1 guide photographs, a salt contamination meter, a digital roughness gauge, and the ISO 8502-3 dust rating chart (levels 1 to 5). The flow chart shows NOT OK returning the pipe to receiving inspection as NTC (re-process).',
            parameters: {
              Cleanliness: 'Sa2½ to Sa3, visual',
              'Anchor profile': '50 to 110 µm',
              Salt: 'measured with meter',
              Dust: 'ISO 8502-3 (1 to 5 chart)',
              'NOT OK': 'NTC re-process',
            },
            standards: ['deck p.8, p.4, p.5'],
            technicalNote:
              'Rejecting here is cheap. Every station after this one adds cost to a pipe that cannot hold a coat.',
          },
        },
        quiz: {
          question:
            'A blasted pipe passes the visual cleanliness check and the roughness reading. Is the surface inspection finished?',
          context:
            'This is where the pipe can be stopped. An inspector compares it with the rust-grade book, measures its roughness, checks for salt and dust, and looks for steel or surface defects. OK goes to the coating line. NOT OK takes the NTC re-process route back to receiving inspection.',
          options: [
            {
              id: 'option-0',
              text: 'Yes, those two are all that matter',
              isCorrect: false,
              explanation:
                'The deck lists five parts to the inspection of surface preparation: cleanliness, anchor profile, salt contamination, degree of dust per ISO 8502-3, and other steel and surface defects. A pipe goes to the coating line only when it clears them all.',
            },
            {
              id: 'option-1',
              text: 'No. Salt contamination, dust degree and any other steel or surface defects are also part of the inspection',
              isCorrect: true,
              explanation:
                'The deck lists five parts to the inspection of surface preparation: cleanliness, anchor profile, salt contamination, degree of dust per ISO 8502-3, and other steel and surface defects. A pipe goes to the coating line only when it clears them all.',
            },
            {
              id: 'option-2',
              text: 'Only for FBE pipes',
              isCorrect: false,
              explanation:
                'The deck lists five parts to the inspection of surface preparation: cleanliness, anchor profile, salt contamination, degree of dust per ISO 8502-3, and other steel and surface defects. A pipe goes to the coating line only when it clears them all.',
            },
          ],
          standardReference: 'deck p.8, p.4, p.5',
        },
        practicalTakeaway:
          'NOT OK is not scrap. It is the re-process route, and the pipe runs surface preparation again.',
      },
      {
        id: 'c6',
        number: 6,
        title: 'Acid wash and the rinse',
        subtitle: 'PHOSPHORIC ACID AND HIGH PRESSURE WATER WASH',
        story:
          'After the blast gate and a first induction pre heat, the pipe meets a phosphoric acid wash. The acid reacts with chlorides and other soluble salts left on the surface and loosens their grip. A high pressure rinse with clean RO water then carries them away, and the pipe is dried.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c6',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A deep clean after the sanding. You cannot see salt on steel, so the plant takes it off with chemistry and water.',
            body: 'The acid wash targets chlorides and soluble salts; the rinse and drying finish the job.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Dwell time is set in advance. The rinse uses low conductivity RO water. The whole process is connected to an acid neutralizer and the ETP system, so the waste is treated and not drained. Drying is by compressed-air knife and a 1200 kW induction heater.',
              'Solution: Oakite 31/33',
              'Rinse water: RO, up to 80 °C',
              'Pressure: 150 bar',
              'Flow: 2500 litres/hour',
              'Drying: air knife + 1200 kW induction heater',
              'Waste: acid neutralizer and ETP',
            ],
            cues: [
              'The acid wash targets chlorides and soluble salts; the rinse and drying finish the job.',
            ],
            warnings:
              'Confirm the preset dwell time range and who may change it. Confirm the two induction pre heating stations on the chart against the equipment layout.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Working solution Oakite 31/33. RO water up to 80 °C at 150 bar, 2500 litres per hour. The result is a surface free of contaminations and chlorides, and “suitably aggressive for coating”. On the 3LPE flow chart the order is induction pre heating, acid wash and rinse, induction pre heating again, then induction heating.',
            parameters: {
              Solution: 'Oakite 31/33',
              'Rinse water': 'RO, up to 80 °C',
              Pressure: '150 bar',
              Flow: '2500 litres/hour',
              Drying: 'air knife + 1200 kW induction heater',
              Waste: 'acid neutralizer and ETP',
            },
            standards: ['deck p.9, p.4'],
            technicalNote:
              'The chart runs induction pre heating before and after this wash. The pipe is being dried and brought up to temperature in steps.',
          },
        },
        quiz: {
          question:
            'What does the phosphoric acid wash do, according to the deck?',
          context:
            'After the blast gate and a first induction pre heat, the pipe meets a phosphoric acid wash. The acid reacts with chlorides and other soluble salts left on the surface and loosens their grip. A high pressure rinse with clean RO water then carries them away, and the pipe is dried.',
          options: [
            {
              id: 'option-0',
              text: 'Reacts with chlorides and soluble salts so they lose their bond with the pipe surface',
              isCorrect: true,
              explanation:
                'The deck says phosphoric acid reacts with chlorides and other soluble salts on the pipe surface so they lose their bond with it. Roughness is the blasting stage’s job, which came earlier.',
            },
            {
              id: 'option-1',
              text: 'Roughens the steel to 50 to 110 µm',
              isCorrect: false,
              explanation:
                'The deck says phosphoric acid reacts with chlorides and other soluble salts on the pipe surface so they lose their bond with it. Roughness is the blasting stage’s job, which came earlier.',
            },
            {
              id: 'option-2',
              text: 'Cools the pipe before the epoxy',
              isCorrect: false,
              explanation:
                'The deck says phosphoric acid reacts with chlorides and other soluble salts on the pipe surface so they lose their bond with it. Roughness is the blasting stage’s job, which came earlier.',
            },
          ],
          standardReference: 'deck p.9, p.4',
        },
        practicalTakeaway:
          'The acid wash targets chlorides and soluble salts; the rinse and drying finish the job.',
      },
      {
        id: 'c7',
        number: 7,
        title: 'Induction heating to 250 °C',
        subtitle: 'INDUCTION HEATER',
        story:
          'The clean pipe now passes through two induction heaters in series. They bring it to coating temperature and hold it there. Inline displays show and record the pipe temperature, because the epoxy powder that comes next only behaves correctly on steel at the right heat.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c7',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A pan has to be hot before the pancake goes in. The pipe has to be hot, and evenly hot, before the powder lands.',
            body: '250 °C is the default. The FBE powder’s own recommendation can override it.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Watch the temperature display and record. The target is 250 °C, or whatever the FBE powder maker recommends. Two heaters in series are there to keep the surface temperature uniform.',
              'Capacity: 2000 kW',
              'Frequency: 600 to 1500 Hz, variable',
              'Throughput: 125 MT/hr for ΔT 225 °C',
              'Pipe temperature: 250 °C, or per FBE powder',
              'Monitoring: inline display and recording',
            ],
            cues: [
              '250 °C is the default. The FBE powder’s own recommendation can override it.',
            ],
            warnings:
              'The deck gives no temperature tolerance. Add the permitted band and the action if the pipe is out of range. Confirm the ΔT 225 °C reference temperature for the throughput figure.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Inductotherm, India. Two sets of series heaters. Capacity 2000 kW, variable frequency 600 to 1500 Hz. Throughput 125 MT per hour for a temperature rise of 225 °C, maintaining pipe temperature at 250 °C or as per recommendation of the FBE powder.',
            parameters: {
              Capacity: '2000 kW',
              Frequency: '600 to 1500 Hz, variable',
              Throughput: '125 MT/hr for ΔT 225 °C',
              'Pipe temperature': '250 °C, or per FBE powder',
              Monitoring: 'inline display and recording',
            },
            standards: ['deck p.10'],
            technicalNote:
              'Do not confuse the 1200 kW induction heater used for drying after the acid wash with this 2000 kW coating-temperature heater.',
          },
        },
        quiz: {
          question:
            'The FBE powder maker recommends a different pipe temperature than 250 °C. What does the deck say?',
          context:
            'The clean pipe now passes through two induction heaters in series. They bring it to coating temperature and hold it there. Inline displays show and record the pipe temperature, because the epoxy powder that comes next only behaves correctly on steel at the right heat.',
          options: [
            {
              id: 'option-0',
              text: 'Hold 250 °C regardless',
              isCorrect: false,
              explanation:
                'The deck says the heater helps maintain pipe temperature at 250 °C “or as per recommendation of FBE powder”. The powder data sheet governs.',
            },
            {
              id: 'option-1',
              text: 'Run to the powder maker’s recommendation',
              isCorrect: true,
              explanation:
                'The deck says the heater helps maintain pipe temperature at 250 °C “or as per recommendation of FBE powder”. The powder data sheet governs.',
            },
            {
              id: 'option-2',
              text: 'Run cooler to save energy',
              isCorrect: false,
              explanation:
                'The deck says the heater helps maintain pipe temperature at 250 °C “or as per recommendation of FBE powder”. The powder data sheet governs.',
            },
          ],
          standardReference: 'deck p.10',
        },
        practicalTakeaway:
          '250 °C is the default. The FBE powder’s own recommendation can override it.',
      },
      {
        id: 'c8',
        number: 8,
        title: 'The epoxy booth',
        subtitle: 'FUSION BONDED EPOXY SPRAY',
        story:
          'The hot pipe arrives in a spray booth. Up to sixty electrostatic guns coat it with epoxy powder, which melts and fuses on contact with the hot steel. On a 3LPE or 3LPP pipe this is the first of three layers, the primer. On an FBE pipe it is the whole coat, and DFBE uses a second booth for a second layer.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c8',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Powder that sticks to a hot surface and melts into a smooth skin, a bit like sprinkling sugar on a hot pan.',
            body: 'Dry, oil-free air at a −40 °C dew point carries the powder.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Powder arrives straight from air-conditioned storage, is sieved and fluidized without a break, and is carried by completely dry, oil-free air. The compressed-air quality is monitored all the time with an alarm. The booth is tied to automatic fire detection and CO₂ suppression.',
              'Spray guns: up to 60 × 20 kg/hr',
              'Spray capacity: 1200 kg/hr',
              'Max thickness, single: 600 µm',
              'Max thickness, dual: 1600 µm',
              'Air dew point: −40 °C',
              'Safety: fire detection + CO₂ suppression',
            ],
            cues: [
              'Dry, oil-free air at a −40 °C dew point carries the powder.',
            ],
            warnings:
              'The deck gives no layer thickness limits for a 3LPE order. Add them from the order specification. The deck names the manufacturer “ITW Gama”; the company is ITW Gema. Correct before release. Confirm what the operator does when thickness drifts or the air alarm trips.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Nordson (USA) and ITW Gema (Germany; the deck spells it “Gama”). Up to 60 guns at 20 kg/hr is 1200 kg/hr in two separated booths. Maximum thickness 600 µm single layer and 1600 µm dual layer. Online process parameter monitoring, control and recording for thickness. Compressed air dew point −40 °C.',
            parameters: {
              'Spray guns': 'up to 60 × 20 kg/hr',
              'Spray capacity': '1200 kg/hr',
              'Max thickness, single': '600 µm',
              'Max thickness, dual': '1600 µm',
              'Air dew point': '−40 °C',
              Safety: 'fire detection + CO₂ suppression',
            },
            standards: ['deck p.11, p.12'],
            technicalNote:
              'The primer layer is thin and sits against the steel. Everything about this booth is about keeping it clean and even.',
          },
        },
        quiz: {
          question:
            'The powder is carried by compressed air. What does the deck require of that air?',
          context:
            'The hot pipe arrives in a spray booth. Up to sixty electrostatic guns coat it with epoxy powder, which melts and fuses on contact with the hot steel. On a 3LPE or 3LPP pipe this is the first of three layers, the primer. On an FBE pipe it is the whole coat, and DFBE uses a second booth for a second layer.',
          options: [
            {
              id: 'option-0',
              text: 'Warm and humid',
              isCorrect: false,
              explanation:
                'The deck specifies complete dry and oil-free compressed air at a dew point of −40 °C, monitored continuously with an alarm. Moisture or oil in the air reaches the powder and then the coating.',
            },
            {
              id: 'option-1',
              text: 'Completely dry and oil-free, dew point −40 °C',
              isCorrect: true,
              explanation:
                'The deck specifies complete dry and oil-free compressed air at a dew point of −40 °C, monitored continuously with an alarm. Moisture or oil in the air reaches the powder and then the coating.',
            },
            {
              id: 'option-2',
              text: 'Any plant air will do',
              isCorrect: false,
              explanation:
                'The deck specifies complete dry and oil-free compressed air at a dew point of −40 °C, monitored continuously with an alarm. Moisture or oil in the air reaches the powder and then the coating.',
            },
          ],
          standardReference: 'deck p.11, p.12',
        },
        practicalTakeaway:
          'Dry, oil-free air at a −40 °C dew point carries the powder.',
      },
      {
        id: 'c9',
        number: 9,
        title: 'Layers two and three, and the weld seam',
        subtitle: 'ADHESIVE, PE / PP AND SEAM SYSTEM',
        story:
          'Two extruders feed through flat T-dies: a small one for the adhesive and two large ones for the polyethylene or polypropylene topcoat. A press-on roller smooths the layers onto the pipe. On a spiral pipe, a laser finds the raised weld seam and a plunger pushes extra molten coating over it.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c9',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A sandwich: epoxy bread, adhesive spread, and a thick outer slice. The seam gets an extra smear because the bump would otherwise be thin.',
            body: 'The weld seam system exists to prevent low thickness on the seam without thickening the whole pipe.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Dryers take moisture out of the granules before they melt. If the body reads fine but the weld seam reads thin, go to the weld seam system first: laser seam detection and the hydraulic plunger.',
              'Adhesive extruder: 250 kg/hr, 400 mm T-die',
              'PE/PP extruders: 2 × 1200 kg/hr, 1200 mm T-die',
              'Seam detection: laser sensors + PLC',
              'Seam coating: hydraulic plunger over the bead',
              'Application: press-on roller from the top',
            ],
            cues: [
              'The weld seam system exists to prevent low thickness on the seam without thickening the whole pipe.',
            ],
            warnings:
              'The deck gives no thickness limits for the adhesive and PE/PP layers. Add them. The deck says “molten HDPE” for the seam. Confirm whether PP pipes use a different material.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Adhesive extruder Ø110 mm, L/D 30, 250 kg/hr, 150 kW drive, 6 to 60 RPM, 400 mm T-die. PE/PP extruders: two Ø200 mm, L/D 32 (the deck prints “Ration”), 2 × 1200 kg/hr, 2 × 750 kW drives, 6 to 70 RPM, common 1200 mm T-die. Seam system: TKPS, Netherlands.',
            parameters: {
              'Adhesive extruder': '250 kg/hr, 400 mm T-die',
              'PE/PP extruders': '2 × 1200 kg/hr, 1200 mm T-die',
              'Seam detection': 'laser sensors + PLC',
              'Seam coating': 'hydraulic plunger over the bead',
              Application: 'press-on roller from the top',
            },
            standards: ['deck p.13, p.14'],
            technicalNote:
              'A thin seam is a typical failure point. Know the system that is built to prevent it.',
          },
        },
        quiz: {
          question:
            'Thickness on the pipe body is fine, but readings right on top of the weld seam are low. Which system do you check first?',
          context:
            'Two extruders feed through flat T-dies: a small one for the adhesive and two large ones for the polyethylene or polypropylene topcoat. A press-on roller smooths the layers onto the pipe. On a spiral pipe, a laser finds the raised weld seam and a plunger pushes extra molten coating over it.',
          options: [
            {
              id: 'option-0',
              text: 'The induction heater',
              isCorrect: false,
              explanation:
                'The seam system is built to prevent low coating thickness over the weld seam. The induction heater warms the whole pipe and the quench cools it; neither adds coating to the seam.',
            },
            {
              id: 'option-1',
              text: 'The weld seam system: laser detection and the hydraulic plunger',
              isCorrect: true,
              explanation:
                'The seam system is built to prevent low coating thickness over the weld seam. The induction heater warms the whole pipe and the quench cools it; neither adds coating to the seam.',
            },
            {
              id: 'option-2',
              text: 'The quench troughs',
              isCorrect: false,
              explanation:
                'The seam system is built to prevent low coating thickness over the weld seam. The induction heater warms the whole pipe and the quench cools it; neither adds coating to the seam.',
            },
          ],
          standardReference: 'deck p.13, p.14',
        },
        practicalTakeaway:
          'The weld seam system exists to prevent low thickness on the seam without thickening the whole pipe.',
      },
      {
        id: 'c10',
        number: 10,
        title: 'The quench: 40 metres of water',
        subtitle: 'QUENCHING ZONE',
        story:
          'The freshly coated pipe is hot and soft. It slides through a 40 metre zone of controlled water cooling, on the outside and on the inside. The water must flow calmly. A rough pour would leave marks on the new surface.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c10',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Cooling a hot cake slowly and evenly, so it does not crack or leave a stain.',
            body: 'Laminar flow prevents water marks.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Chilled and cooled water are used in different areas. Special troughs keep the flow laminar so there are no water marks. High pressure nozzles cool the inside of the pipe as well.',
              'Length: 40 m',
              'Water: chilled and cooled, by area',
              'Flow: laminar, special troughs',
              'Inside: high pressure nozzles',
            ],
            cues: ['Laminar flow prevents water marks.'],
            warnings:
              'The deck gives no exit temperature and no action for water marks or uneven cooling. Add them.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Quench area 40 m long. Controlled use of chilled and cooled water in different areas. Laminar flow maintained with special water flow troughs. Inside cooling with special high pressure nozzles.',
            parameters: {
              Length: '40 m',
              Water: 'chilled and cooled, by area',
              Flow: 'laminar, special troughs',
              Inside: 'high pressure nozzles',
            },
            standards: ['deck p.15'],
            technicalNote:
              'A water mark on a finished pipe starts here, not at the inspection bench.',
          },
        },
        quiz: {
          question: 'Which statement about the quench matches the deck?',
          context:
            'The freshly coated pipe is hot and soft. It slides through a 40 metre zone of controlled water cooling, on the outside and on the inside. The water must flow calmly. A rough pour would leave marks on the new surface.',
          options: [
            {
              id: 'option-0',
              text: 'Only the outside is cooled',
              isCorrect: false,
              explanation:
                'The deck says laminar flow is kept with special troughs to prevent water marks, and the inside is cooled with high pressure nozzles. Chilled and cooled water are used in different areas.',
            },
            {
              id: 'option-1',
              text: 'The outside is cooled with laminar flow troughs and the inside with high pressure nozzles',
              isCorrect: true,
              explanation:
                'The deck says laminar flow is kept with special troughs to prevent water marks, and the inside is cooled with high pressure nozzles. Chilled and cooled water are used in different areas.',
            },
            {
              id: 'option-2',
              text: 'Only chilled water is used',
              isCorrect: false,
              explanation:
                'The deck says laminar flow is kept with special troughs to prevent water marks, and the inside is cooled with high pressure nozzles. Chilled and cooled water are used in different areas.',
            },
          ],
          standardReference: 'deck p.15',
        },
        practicalTakeaway: 'Laminar flow prevents water marks.',
      },
      {
        id: 'c11',
        number: 11,
        title: 'Measure it and look at it',
        subtitle: 'THICKNESS AND VISUAL INSPECTION',
        story:
          'After quench, the pipe gets its first look and its first measurements. A digital eddy current gauge reads the epoxy layer, the adhesive layer and the total coating thickness. A visual and dimensional inspection follows on the flow chart.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c11',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A doctor’s check-up: look, measure, and compare with the chart.',
            body: 'A gauge that was right yesterday is not proven right today. Verify every shift.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Calibrate the gauge with standard foils or strips every shift before you trust any reading. Look at the surface and check the dimensions the order calls for.',
              'Gauge: digital eddy current',
              'Measures: epoxy layer, adhesive layer, total thickness',
              'Calibration check: every shift, standard foils/strips',
            ],
            cues: [
              'A gauge that was right yesterday is not proven right today. Verify every shift.',
            ],
            warnings:
              'The deck gives no thickness limits per layer and no action for under- or over-thickness. Add them. Dimensional checks at this station are listed on the chart only. Add the characteristics and tolerances.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Digital eddy current based coating thickness tester, for the epoxy layer, the adhesive layer and total thickness of the coating system (FBE/DFBE as written on the slide). Verification of calibration with standard calibration foils or strips every shift.',
            parameters: {
              Gauge: 'digital eddy current',
              Measures: 'epoxy layer, adhesive layer, total thickness',
              'Calibration check': 'every shift, standard foils/strips',
            },
            standards: ['deck p.16, p.4, p.5'],
            technicalNote:
              'Every measurement downstream depends on a gauge you verified.',
          },
        },
        quiz: {
          question:
            'It is the start of a new shift. The thickness gauge read perfectly yesterday. Do you use it straight away?',
          context:
            'After quench, the pipe gets its first look and its first measurements. A digital eddy current gauge reads the epoxy layer, the adhesive layer and the total coating thickness. A visual and dimensional inspection follows on the flow chart.',
          options: [
            {
              id: 'option-0',
              text: 'Yes, it was fine yesterday',
              isCorrect: false,
              explanation:
                'The deck says calibration is verified with standard calibration foils or strips every shift. A drifting gauge can give readings that look normal.',
            },
            {
              id: 'option-1',
              text: 'No. Verify it against standard foils or strips first',
              isCorrect: true,
              explanation:
                'The deck says calibration is verified with standard calibration foils or strips every shift. A drifting gauge can give readings that look normal.',
            },
            {
              id: 'option-2',
              text: 'Only if readings start to look strange',
              isCorrect: false,
              explanation:
                'The deck says calibration is verified with standard calibration foils or strips every shift. A drifting gauge can give readings that look normal.',
            },
          ],
          standardReference: 'deck p.16, p.4, p.5',
        },
        practicalTakeaway:
          'A gauge that was right yesterday is not proven right today. Verify every shift.',
      },
      {
        id: 'c12',
        number: 12,
        title: 'The holiday test',
        subtitle: 'HOLIDAY DETECTION',
        story:
          'A holiday is a pinhole you may not see. An electrode sweeps the coating at high voltage, and wherever there is a hole, current finds the steel. The hooter sounds and the bulb lights. An in-line detector tests the pipe, and portable manual detectors confirm and locate what it finds.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c12',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A metal detector for holes. The probe sweeps the pipe, and if there is a hole, it beeps.',
            body: 'The pass condition is: no holiday, or a holiday that meets the repair criteria and passes the retest.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Ground the pipe and the detector, set the voltage for the coating system, keep the electrode speed at or below the maximum, and calibrate the detector every four hours with jeep meters. Too much voltage can damage the coating.',
              '3LPE / 3LPP voltage: 25 kV, or as specified by client',
              'FBE / DFBE voltage: 5 V per µm (deck: “5 volt/Rm”)',
              'Max electrode speed: 300 mm/s',
              'Detector calibration: every 4 hours, jeep meters',
              'Indication: hooter + indicator bulb',
            ],
            cues: [
              'The pass condition is: no holiday, or a holiday that meets the repair criteria and passes the retest.',
            ],
            warnings:
              'The deck writes “5 volt/Rm” for FBE/DFBE. The reading used here is 5 volts per micrometre of thickness. Confirm. The deck prints “3LPE/SLPP” on one slide; read as 3LPE/3LPP. The repair criteria are not in the deck. Add them.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'In-line DC pulse type. Individual detectors for 500 to 5000 V and 1000 to 40,000 V. For 3LPE/3LPP the set voltage is 25 kV or as specified by the client. For FBE/DFBE the deck says “@5 volt/Rm coating thickness” or per customer requirement. Maximum electrode speed 300 mm/s as per the approved ITP/QAP. Pulse type: higher pulse rates allow higher speed. Non-pulse type: speed is limited by mechanics and response time.',
            parameters: {
              '3LPE / 3LPP voltage': '25 kV, or as specified by client',
              'FBE / DFBE voltage': '5 V per µm (deck: “5 volt/Rm”)',
              'Max electrode speed': '300 mm/s',
              'Detector calibration': 'every 4 hours, jeep meters',
              Indication: 'hooter + indicator bulb',
            },
            standards: ['deck p.17, p.18, p.19'],
            technicalNote:
              'Setting voltage too high is a real risk: the detector can be destructive. Always confirm the set voltage.',
          },
        },
        quiz: {
          question:
            'The in-line test flags a pipe. A manual holiday test confirms one pinhole, and it meets the repair criteria. What next?',
          context:
            'A holiday is a pinhole you may not see. An electrode sweeps the coating at high voltage, and wherever there is a hole, current finds the steel. The hooter sounds and the bulb lights. An in-line detector tests the pipe, and portable manual detectors confirm and locate what it finds.',
          options: [
            {
              id: 'option-0',
              text: 'Reject the pipe',
              isCorrect: false,
              explanation:
                'The flow chart sends a holiday that meets the repair criteria to coating repair, then a second manual holiday test. Only OK goes to final inspection. A holiday that does not meet the repair criteria is rejected.',
            },
            {
              id: 'option-1',
              text: 'Repair it, then test again by manual holiday test. If it passes, it goes to final inspection',
              isCorrect: true,
              explanation:
                'The flow chart sends a holiday that meets the repair criteria to coating repair, then a second manual holiday test. Only OK goes to final inspection. A holiday that does not meet the repair criteria is rejected.',
            },
            {
              id: 'option-2',
              text: 'Repair it and send it straight to final inspection',
              isCorrect: false,
              explanation:
                'The flow chart sends a holiday that meets the repair criteria to coating repair, then a second manual holiday test. Only OK goes to final inspection. A holiday that does not meet the repair criteria is rejected.',
            },
          ],
          standardReference: 'deck p.17, p.18, p.19',
        },
        practicalTakeaway:
          'The pass condition is: no holiday, or a holiday that meets the repair criteria and passes the retest.',
      },
      {
        id: 'c13',
        number: 13,
        title: 'The peel test',
        subtitle: 'BOND STRENGTH, OFFLINE',
        story:
          'Some answers cannot be read on a moving line. A strip of coating is pulled straight off the pipe in the lab and the force is measured. It tells you whether the layers are bonded to each other.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c13',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Peeling a sticker. If it comes off easily, the glue is weak.',
            body: 'The peel test measures the bond between top and bottom layers.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'The tester peels at 10 mm per minute, perpendicular to the pipe surface. Results are given as minimum, maximum and average. If a semi-automated machine gives a strange value, suspect the machine before the coating.',
              'Peel rate: 10 mm/min',
              'Direction: perpendicular to the pipe surface',
              'Range: 0 to 2.5 kN',
              'Results: minimum, maximum, average',
            ],
            cues: [
              'The peel test measures the bond between top and bottom layers.',
            ],
            warnings:
              'The minimum peel value that passes is not in the deck. Add it from the standard or order. Confirm the test frequency and sample location.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Make Coesfeld, Germany. Range 0 to 2.5 kN. Standards named in the deck: DIN 30670, DIN 30678 Type 2, CSA Z245.21, ISO 21809-1, NF A 49-710/711. Automated tester with separate drives for carriage and stripping and automatic control on stripping angle. A semi-automated machine may produce false results because it cannot adjust itself to peel angle and speed.',
            parameters: {
              'Peel rate': '10 mm/min',
              Direction: 'perpendicular to the pipe surface',
              Range: '0 to 2.5 kN',
              Results: 'minimum, maximum, average',
            },
            standards: ['deck p.20'],
            technicalNote:
              'Check the instrument, then check the sample. Order matters.',
          },
        },
        quiz: {
          question:
            'A semi-automated peel tester gives one surprisingly low value. Before blaming the coating, what does the deck say to suspect?',
          context:
            'Some answers cannot be read on a moving line. A strip of coating is pulled straight off the pipe in the lab and the force is measured. It tells you whether the layers are bonded to each other.',
          options: [
            {
              id: 'option-0',
              text: 'The pipe end is always weaker',
              isCorrect: false,
              explanation:
                'The deck states the semi-automated machine may produce false results because of its inability to adjust to peel angle and speed. That is why the automated tester controls the stripping angle itself.',
            },
            {
              id: 'option-1',
              text: 'The machine: it cannot adjust peel angle and speed, so it may give false results',
              isCorrect: true,
              explanation:
                'The deck states the semi-automated machine may produce false results because of its inability to adjust to peel angle and speed. That is why the automated tester controls the stripping angle itself.',
            },
            {
              id: 'option-2',
              text: 'The pipe was tested too soon after quench',
              isCorrect: false,
              explanation:
                'The deck states the semi-automated machine may produce false results because of its inability to adjust to peel angle and speed. That is why the automated tester controls the stripping angle itself.',
            },
          ],
          standardReference: 'deck p.20',
        },
        practicalTakeaway:
          'The peel test measures the bond between top and bottom layers.',
      },
      {
        id: 'c14',
        number: 14,
        title: 'Final inspection, marking and dispatch',
        subtitle: 'RELEASE',
        story:
          'After the holiday test the pipe’s ends are cleaned back (cut back cleaning), and it faces final inspection. The inspector checks the coating for defects, measures the cut back and the bevel, and verifies the paperwork. Then the pipe is marked, barcoded, varnished against rust and stacked for dispatch.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c14',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'The last look in the mirror before leaving the house, plus the label on the parcel.',
            body: 'A pipe leaves only when the coating, the dimensions and the documents all agree.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Check as per the ITP: holidays and pinholes, disbonding or delamination, fish eyes and craters, blistering, sagging and drips (3LPE/3LPP), coating damage, surface irregularities, cut back cleaning and length, pipe bevel cleaning, and coating bevel shape.',
              'Defects checked: holidays, disbonding, fish eyes, blistering, sagging',
              'Also checked: coating damage, surface irregularities',
              'Ends: cut back cleaning, length, bevel cleaning, coating bevel shape',
              'Release: marking, barcode, varnish, documents',
            ],
            cues: [
              'A pipe leaves only when the coating, the dimensions and the documents all agree.',
            ],
            warnings:
              'Acceptance limits for cut back length, bevel angle and FBE toe are not in the deck. Add them. Confirm who signs the clearance and whether a third party inspector is involved.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Final inspection and clearance of coated pipes; visual inspection of external coating; visual and dimension check of cut back length, coating bevel angle and FBE toe; pipe marking and barcode application; application of rust prevention varnish; verification of documents with respect to coated pipe data.',
            parameters: {
              'Defects checked':
                'holidays, disbonding, fish eyes, blistering, sagging',
              'Also checked': 'coating damage, surface irregularities',
              Ends: 'cut back cleaning, length, bevel cleaning, coating bevel shape',
              Release: 'marking, barcode, varnish, documents',
            },
            standards: ['deck p.21, p.24, p.4'],
            technicalNote:
              'Finished is not released. Release needs the documents.',
          },
        },
        quiz: {
          question:
            'A pipe passes every physical check, but its documents do not match the coated pipe data. What do you do?',
          context:
            'After the holiday test the pipe’s ends are cleaned back (cut back cleaning), and it faces final inspection. The inspector checks the coating for defects, measures the cut back and the bevel, and verifies the paperwork. Then the pipe is marked, barcoded, varnished against rust and stacked for dispatch.',
          options: [
            {
              id: 'option-0',
              text: 'Release it, the pipe is fine',
              isCorrect: false,
              explanation:
                'The deck lists verification of documents with respect to coated pipe data as part of final inspection. A pipe is not cleared until the record and the pipe agree.',
            },
            {
              id: 'option-1',
              text: 'Hold it. Verification of documents against pipe data is part of final inspection',
              isCorrect: true,
              explanation:
                'The deck lists verification of documents with respect to coated pipe data as part of final inspection. A pipe is not cleared until the record and the pipe agree.',
            },
            {
              id: 'option-2',
              text: 'Release it and fix the paperwork later',
              isCorrect: false,
              explanation:
                'The deck lists verification of documents with respect to coated pipe data as part of final inspection. A pipe is not cleared until the record and the pipe agree.',
            },
          ],
          standardReference: 'deck p.21, p.24, p.4',
        },
        practicalTakeaway:
          'A pipe leaves only when the coating, the dimensions and the documents all agree.',
      },
      {
        id: 'c15',
        number: 15,
        title: 'Inside the pipe: prepare',
        subtitle: 'INTERNAL COATING, PART 1',
        story:
          'The inside has its own line. Pipes are checked on receipt, preheated in two stations to a dew point condition, blasted in two stations, blown out, and inspected. Failures take the NTC re-process route. The same ideas as outside, with one big difference: moisture control is tied to the dew point of the day.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c15',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Paint a bathroom wall when the air is damp and the paint does not dry right. The plant warms the inside of the pipe above the dew point so no moisture forms.',
            body: 'Inside, the surface must be 3 °C above the atmospheric dew point.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Preheating raises the surface temperature to 3 °C above the atmospheric dew point, using whirling hot air inside the pipe. Blasting reaches up to Sa3. The inspection looks at cleanliness, anchor profile, salt or chloride, degree of dust and other defects.',
              'Preheat: 2 parallel stations, hot air',
              'Surface temperature: 3 °C above dew point',
              'Blast sets: 2 parallel, 400 m²/hr each',
              'Cleanliness: up to Sa3',
              'Anchor pattern: 50 to 100 µm',
              'Dust collectors: 2 × 85,000 + 2 × 11,000 CMH',
            ],
            cues: [
              'Inside, the surface must be 3 °C above the atmospheric dew point.',
            ],
            warnings:
              'The internal blasting slide gives dust level as “Level 1 (ISO 8503)”. ISO 8503 covers surface profile, and dust is rated under ISO 8502-3 (as the inspection slide shows). Confirm the intended standard. The internal anchor pattern (50 to 100 µm) differs from the external (50 to 110 µm). Confirm both are intended. Blow out station has no detail in the deck.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Two parallel preheating stations, hot air generator with recirculation. Two parallel blast sets; blast wheel rotation by high speed hydraulic motor from a 150 kW power pack each; separate impeller and booms for different pipe sizes. Individual capacity 400 m²/hr, combined over 600 m²/hr. ISO 8501 up to Sa3, anchor pattern 50 to 100 µm. Dust collection 2 × 85,000 CMH plus 2 × 11,000 CMH.',
            parameters: {
              Preheat: '2 parallel stations, hot air',
              'Surface temperature': '3 °C above dew point',
              'Blast sets': '2 parallel, 400 m²/hr each',
              Cleanliness: 'up to Sa3',
              'Anchor pattern': '50 to 100 µm',
              'Dust collectors': '2 × 85,000 + 2 × 11,000 CMH',
            },
            standards: ['deck p.26, p.27, p.28, p.29'],
            technicalNote:
              'Outside, the oven goes to a set figure up to 85 °C. Inside, the target moves with the weather.',
          },
        },
        quiz: {
          question:
            'Today is humid and the atmospheric dew point is higher than yesterday. What happens to the internal preheat target?',
          context:
            'The inside has its own line. Pipes are checked on receipt, preheated in two stations to a dew point condition, blasted in two stations, blown out, and inspected. Failures take the NTC re-process route. The same ideas as outside, with one big difference: moisture control is tied to the dew point of the day.',
          options: [
            {
              id: 'option-0',
              text: 'Nothing, it is a fixed number',
              isCorrect: false,
              explanation:
                'The deck defines the target as a temperature 3 °C above the atmospheric dew point. When the dew point rises, the target rises with it.',
            },
            {
              id: 'option-1',
              text: 'It moves up with the dew point: the surface must be 3 °C above it',
              isCorrect: true,
              explanation:
                'The deck defines the target as a temperature 3 °C above the atmospheric dew point. When the dew point rises, the target rises with it.',
            },
            {
              id: 'option-2',
              text: 'The pipe does not need preheating on humid days',
              isCorrect: false,
              explanation:
                'The deck defines the target as a temperature 3 °C above the atmospheric dew point. When the dew point rises, the target rises with it.',
            },
          ],
          standardReference: 'deck p.26, p.27, p.28, p.29',
        },
        practicalTakeaway:
          'Inside, the surface must be 3 °C above the atmospheric dew point.',
      },
      {
        id: 'c16',
        number: 16,
        title: 'Inside the pipe: line it',
        subtitle: 'INTERNAL COATING, PART 2',
        story:
          'Tape protects the cut back ends, then a long unsupported lance spins into the pipe as it turns at high speed. A two-part paint is mixed at the lance and sprayed in one smooth, even pass. After the lining, the tape comes off, the pipe is inspected, stencilled, and left to cure in the yard.',
        diagramType: 'inspection_gates',
        referenceRoute: 'coat-c16',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Painting a tube from inside with a spray that mixes two colours at the nozzle, so the paint does not set before it lands.',
            body: 'The mix ratio is controlled digitally and monitored all the time.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'The paint mix ratio is watched by the PLC all the time and held within tolerance. Paint is heated to keep it fluid. The ratio can be set from 1:1 to 10:1 in steps of 0.1, with a ratio check system.',
              'Mixing ratio: 1:1 to 10:1, 0.1 steps',
              'Tolerance: down to ±1%',
              'Thickness range: 50 to 2000 µm',
              'System: plural feed, hot airless',
              'After lining: tape removal, visual inspection, stencilling, curing in yard',
            ],
            cues: [
              'The mix ratio is controlled digitally and monitored all the time.',
            ],
            warnings:
              'The deck gives no dry film thickness limits or inspection checks after lining. Add them. Confirm curing time and handling rules in the yard.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Unsupported painting lance on a rotary pipe at high RPM. Plural feed hot airless system based on Graco Extreme Mix, with automated paint transfer and feeding. Digital ratio adjustable system with ratio check, automatic mixing within predefined tolerance down to ±1%. Suitable for coating thickness from 50 to 2000 microns.',
            parameters: {
              'Mixing ratio': '1:1 to 10:1, 0.1 steps',
              Tolerance: 'down to ±1%',
              'Thickness range': '50 to 2000 µm',
              System: 'plural feed, hot airless',
              'After lining':
                'tape removal, visual inspection, stencilling, curing in yard',
            },
            standards: ['deck p.30, p.26'],
            technicalNote:
              'You now know the whole line. The final assessment follows.',
          },
        },
        quiz: {
          question:
            'In what order do the cut back tape and the lining go on, according to the internal flow chart?',
          context:
            'Tape protects the cut back ends, then a long unsupported lance spins into the pipe as it turns at high speed. A two-part paint is mixed at the lance and sprayed in one smooth, even pass. After the lining, the tape comes off, the pipe is inspected, stencilled, and left to cure in the yard.',
          options: [
            {
              id: 'option-0',
              text: 'Tape on, lining applied, tape removed',
              isCorrect: true,
              explanation:
                'The chart shows cut back preparation (tape application), internal coating application, then tape removal, then visual inspection, then stencilling and paint curing at the yard.',
            },
            {
              id: 'option-1',
              text: 'Lining first, then tape',
              isCorrect: false,
              explanation:
                'The chart shows cut back preparation (tape application), internal coating application, then tape removal, then visual inspection, then stencilling and paint curing at the yard.',
            },
            {
              id: 'option-2',
              text: 'No tape is used',
              isCorrect: false,
              explanation:
                'The chart shows cut back preparation (tape application), internal coating application, then tape removal, then visual inspection, then stencilling and paint curing at the yard.',
            },
          ],
          standardReference: 'deck p.30, p.26',
        },
        practicalTakeaway:
          'The mix ratio is controlled digitally and monitored all the time.',
      },
    ],
  },
  {
    id: 'vi',
    code: 'REF-VT-02',
    title: 'visual inspection',
    sourcePdf: '/learning/visual-inspection.pdf',
    subtitle:
      'Visual inspection: from NDT basics to steel, pipe-body and weld defects',
    description:
      'Before any machine tests a pipe, a trained eye looks first. In ten stops you learn why, how to set up a proper look, which tools help, and what the common defects look like and why they happen.',
    category: 'Quality & Compliance',
    estimatedMinutes: 110,
    badgeLabel: 'Reference course',
    thumbnailType: 'quality_stamp',
    scenes: [
      {
        id: 'v1',
        number: 1,
        title: 'Why we test without breaking',
        subtitle: 'NON-DESTRUCTIVE TESTING',
        story:
          'A pipe that has been cut open to be checked cannot be sold. Non-destructive testing (NDT) examines materials, components or assemblies for discontinuities or differences in characteristics without destroying their usefulness. It is used while a product is made, while it is built into something, and while it is in service.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v1',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Like looking at an egg against a torch to see if it is cracked, instead of breaking it open.',
            body: 'NDT gives an excellent balance between quality control and cost, because the part is still usable afterwards.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'NDT is used at almost any stage: to screen incoming material, to monitor and control a process, to verify heat treating or assembly, and to inspect for damage in service. Pick the method that finds the defect or makes the measurement with the best sensitivity and reliability, and weigh the cost.',
              'Also called: NDE, NDI',
              'Used when: incoming material, process control, heat treating, assembly, in-service damage',
              'Main benefit: safer product, less scrap, better reputation',
            ],
            cues: [
              'NDT gives an excellent balance between quality control and cost, because the part is still usable afterwards.',
            ],
            warnings:
              'The “Safety Precautions” slide (p.4) has a title only. Add the safety content. The table on p.5 and the “Types of NDT techniques” picture on p.9 are images. Transcribe the list of methods.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'The deck also names the same field NDE (examination), NDI (inspection) and NDE (evaluation). Uses are divided into nine areas, from flaw detection to chemical composition. Factors to consider when planning NDT: reliable and safe operation, quality assurance level reached, manufacturing processes and material properties, feasibility of methods available, and economic criteria.',
            parameters: {
              'Also called': 'NDE, NDI',
              'Used when':
                'incoming material, process control, heat treating, assembly, in-service damage',
              'Main benefit': 'safer product, less scrap, better reputation',
            },
            standards: ['deck p.5 to p.9'],
            technicalNote:
              'Method choice is a trade-off, not a ranking. The best method is the one that finds the defect you care about at a sensible cost.',
          },
        },
        quiz: {
          question:
            'Which of these is NOT a benefit of NDT in manufacturing listed in the deck?',
          context:
            'A pipe that has been cut open to be checked cannot be sold. Non-destructive testing (NDT) examines materials, components or assemblies for discontinuities or differences in characteristics without destroying their usefulness. It is used while a product is made, while it is built into something, and while it is in service.',
          options: [
            {
              id: 'option-0',
              text: 'It increases the safety and reliability of the product',
              isCorrect: false,
              explanation:
                'NDT works without destroying the part. The deck’s benefits are safer and more reliable products, lower cost through less scrap, a better reputation for quality, and the ability to design new products.',
            },
            {
              id: 'option-1',
              text: 'It decreases cost by reducing scrap and conserving materials, labour and energy',
              isCorrect: false,
              explanation:
                'NDT works without destroying the part. The deck’s benefits are safer and more reliable products, lower cost through less scrap, a better reputation for quality, and the ability to design new products.',
            },
            {
              id: 'option-2',
              text: 'It proves quality by destroying a sample from every product',
              isCorrect: true,
              explanation:
                'NDT works without destroying the part. The deck’s benefits are safer and more reliable products, lower cost through less scrap, a better reputation for quality, and the ability to design new products.',
            },
          ],
          standardReference: 'deck p.5 to p.9',
        },
        practicalTakeaway:
          'NDT gives an excellent balance between quality control and cost, because the part is still usable afterwards.',
      },
      {
        id: 'v2',
        number: 2,
        title: 'The oldest test: your eyes',
        subtitle: 'VISUAL TESTING',
        story:
          'Visual testing (VT) is the oldest and most common non-destructive technique, and the first step in examining a casting, forging, machined component or weld. It means examining a material, component or product for non-conformance using light and eyes, alone or with aids.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v2',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Look carefully before you reach for a gadget. Most problems you can see are the cheapest to fix.',
            body: 'VT needs no equipment except the naked eye of a trained inspector, but it still needs a trained inspector.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'VT finds surface flaws: corrosion, contamination, surface finish problems and discontinuities on joints such as welds, seals, solder connections and adhesive bonds. It is easy to use throughout a job, so simple errors are caught before they spread. A trained inspector also shakes, listens, feels and sometimes smells.',
              'Finds: cracks, corrosion, contamination, finish, surface discontinuities',
              'Strength: cheapest and widest-used, first step',
              'Needs: a trained eye, light, access',
            ],
            cues: [
              'VT needs no equipment except the naked eye of a trained inspector, but it still needs a trained inspector.',
            ],
            warnings:
              'Use the approved project specification and ITP for acceptance decisions.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'VT is the most cost-effective way to detect common defects in welding and castings, and the most widely used for detecting cracks, which matter because of their link to structural failure. Even when other methods find surface cracks, VT often supplements them. Formally: monitoring specific parameters by visual and optical assessment using the visible portion of the electromagnetic spectrum.',
            parameters: {
              Finds:
                'cracks, corrosion, contamination, finish, surface discontinuities',
              Strength: 'cheapest and widest-used, first step',
              Needs: 'a trained eye, light, access',
            },
            standards: ['deck p.10, p.11, p.17, p.30'],
            technicalNote:
              'Cheap does not mean casual. A good visual inspection follows a method (next stops).',
          },
        },
        quiz: {
          question:
            'Why do inspectors still do visual testing even when another NDT method is also used?',
          context:
            'Visual testing (VT) is the oldest and most common non-destructive technique, and the first step in examining a casting, forging, machined component or weld. It means examining a material, component or product for non-conformance using light and eyes, alone or with aids.',
          options: [
            {
              id: 'option-0',
              text: 'It is never needed once another method is used',
              isCorrect: false,
              explanation:
                'The deck calls VT the first step in the examination process, and says that even when other techniques detect surface cracks, visual inspection often gives a useful supplement. It does not find internal flaws.',
            },
            {
              id: 'option-1',
              text: 'It is the first step and often supplements other methods in finding surface cracks',
              isCorrect: true,
              explanation:
                'The deck calls VT the first step in the examination process, and says that even when other techniques detect surface cracks, visual inspection often gives a useful supplement. It does not find internal flaws.',
            },
            {
              id: 'option-2',
              text: 'It is the only method that finds internal flaws',
              isCorrect: false,
              explanation:
                'The deck calls VT the first step in the examination process, and says that even when other techniques detect surface cracks, visual inspection often gives a useful supplement. It does not find internal flaws.',
            },
          ],
          standardReference: 'deck p.10, p.11, p.17, p.30',
        },
        practicalTakeaway:
          'VT needs no equipment except the naked eye of a trained inspector, but it still needs a trained inspector.',
      },
      {
        id: 'v3',
        number: 3,
        title: 'Set up the look',
        subtitle: 'CONDITIONS FOR VISUAL INSPECTION',
        story:
          'A clean, comfortable, well-lit place with reasonable access. A test piece free of coatings, oil and grease. Calibrated equipment the inspector understands. And the eye at the right distance and angle, under enough light to resolve a very fine line.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v3',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'You cannot read a book in the dark with your nose against the page. The inspector needs enough light, a sensible distance and a good angle.',
            body: 'Different standards ask for different light. Your contract decides which number applies.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Clean the surface. Check the light. Keep your eye within 600 mm of the surface at an angle of at least 30° (ASME Sec V, Art. 9). Use a magnifier if required. The test is judged adequate if you can resolve a 0.8 mm wide black line on an artificial flaw on the surface.',
              'Eye distance: within 600 mm',
              'Viewing angle: 30° or more',
              'Light (ASME V Art. 9): 350 lux min, over 500 recommended',
              'Light (API 5L, 45th ed.): 300 lux min',
              'Light (ASME V / API 5LD): 1000 lux min',
              'Resolve: a 0.8 mm black line',
              'Near vision: Jaeger No. 2 at ≥12 in, annual',
              'Colour vision: every 5 years',
            ],
            cues: [
              'Different standards ask for different light. Your contract decides which number applies.',
            ],
            warnings:
              'The deck gives four different light levels across standards. Confirm which applies to each product and customer. The deck says the near vision test uses Jaeger No. 2 at 12 inches. Confirm the current SNT-TC-1A wording used at the plant.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Illumination depends on the standard: at least 300 lux per API 5L 45th edition, at least 1000 lux per ASME Sec V and API 5LD, and at least 350 lux (500 or more recommended) per ASME Sec V Art. 9. Inspectors must read a Jaeger No. 2 chart (or equivalent) at not less than 12 inches, tested annually, and be tested for colour vision every 5 years, as specified in ASNT SNT-TC-1A.',
            parameters: {
              'Eye distance': 'within 600 mm',
              'Viewing angle': '30° or more',
              'Light (ASME V Art. 9)': '350 lux min, over 500 recommended',
              'Light (API 5L, 45th ed.)': '300 lux min',
              'Light (ASME V / API 5LD)': '1000 lux min',
              Resolve: 'a 0.8 mm black line',
              'Near vision': 'Jaeger No. 2 at ≥12 in, annual',
              'Colour vision': 'every 5 years',
            },
            standards: ['deck p.12 to p.16'],
            technicalNote:
              'Never quote “the” lux level. Quote the lux level for the standard in force.',
          },
        },
        quiz: {
          question:
            'Your contract calls up API 5L, 45th edition. What is the minimum illumination on the surface according to the deck?',
          context:
            'A clean, comfortable, well-lit place with reasonable access. A test piece free of coatings, oil and grease. Calibrated equipment the inspector understands. And the eye at the right distance and angle, under enough light to resolve a very fine line.',
          options: [
            {
              id: 'option-0',
              text: 'At least 300 lux',
              isCorrect: true,
              explanation:
                'The deck gives at least 300 lux for API 5L 45th edition. It gives 1000 lux for ASME Sec V and API 5LD, and 350 lux (500 recommended) for ASME Sec V Art. 9. Always check which standard your contract names.',
            },
            {
              id: 'option-1',
              text: 'At least 350 lux',
              isCorrect: false,
              explanation:
                'The deck gives at least 300 lux for API 5L 45th edition. It gives 1000 lux for ASME Sec V and API 5LD, and 350 lux (500 recommended) for ASME Sec V Art. 9. Always check which standard your contract names.',
            },
            {
              id: 'option-2',
              text: 'At least 1000 lux',
              isCorrect: false,
              explanation:
                'The deck gives at least 300 lux for API 5L 45th edition. It gives 1000 lux for ASME Sec V and API 5LD, and 350 lux (500 recommended) for ASME Sec V Art. 9. Always check which standard your contract names.',
            },
          ],
          standardReference: 'deck p.12 to p.16',
        },
        practicalTakeaway:
          'Different standards ask for different light. Your contract decides which number applies.',
      },
      {
        id: 'v4',
        number: 4,
        title: 'The method and three ways to look',
        subtitle: 'PROCEDURE AND TYPES',
        story:
          'A visual inspection has three steps: clean the surface, light it properly, examine it. And there are three ways to look: with the eye alone, with the eye plus an aid, or through a camera.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v4',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Wipe the window, turn on the light, then look. And you can look with your own eyes, a magnifier, or a camera.',
            body: 'Direct aided keeps the image the same, only bigger or filtered. Remote turns it into an electronic image.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Clean off oil, grease, scale and sand, because contaminants can mislead you. Light the specimen well: the human eye is most sensitive to yellow-green light (wavelength 5560 Å). Then examine with the eyes, or with light-sensitive devices such as photocells.',
              'Step 1: clean the inspection surface',
              'Step 2: light it adequately',
              'Step 3: examine with eyes or light-sensitive devices',
              'Best eye sensitivity: yellow-green, 5560 Å',
            ],
            cues: [
              'Direct aided keeps the image the same, only bigger or filtered. Remote turns it into an electronic image.',
            ],
            warnings:
              'The deck labels the middle type “Directed Aided VT” on one slide. Read as direct aided.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Direct unaided: access to the area is safe and there is no interruption between eye and object; finds cracks, corrosion layer, physical damage, surface porosity and misalignment. Direct aided: the nature of the image is not modified; only magnification (mirror, lens, endoscope) and filtering are allowed. Remote: the image is modified, for example converted into an electronic image by a camera; equipment includes cameras, robotic devices, fibre optics and portable video probes.',
            parameters: {
              'Step 1': 'clean the inspection surface',
              'Step 2': 'light it adequately',
              'Step 3': 'examine with eyes or light-sensitive devices',
              'Best eye sensitivity': 'yellow-green, 5560 Å',
            },
            standards: ['deck p.18 to p.22'],
            technicalNote:
              'If a screen is between you and the surface, it is remote.',
          },
        },
        quiz: {
          question:
            'An inspector looks into a bore using a mirror on a handle. Which type of visual testing is this?',
          context:
            'A visual inspection has three steps: clean the surface, light it properly, examine it. And there are three ways to look: with the eye alone, with the eye plus an aid, or through a camera.',
          options: [
            {
              id: 'option-0',
              text: 'Direct unaided',
              isCorrect: false,
              explanation:
                'A mirror magnifies or redirects the view without changing the nature of the image, so it is direct aided. Remote testing converts the optical image into an electronic image, for example with a camera.',
            },
            {
              id: 'option-1',
              text: 'Direct aided',
              isCorrect: true,
              explanation:
                'A mirror magnifies or redirects the view without changing the nature of the image, so it is direct aided. Remote testing converts the optical image into an electronic image, for example with a camera.',
            },
            {
              id: 'option-2',
              text: 'Remote',
              isCorrect: false,
              explanation:
                'A mirror magnifies or redirects the view without changing the nature of the image, so it is direct aided. Remote testing converts the optical image into an electronic image, for example with a camera.',
            },
          ],
          standardReference: 'deck p.18 to p.22',
        },
        practicalTakeaway:
          'Direct aided keeps the image the same, only bigger or filtered. Remote turns it into an electronic image.',
      },
      {
        id: 'v5',
        number: 5,
        title: 'Light, surfaces and the inspector’s aids',
        subtitle: 'OPTICAL AND MECHANICAL AIDS',
        story:
          'Lighting is of extreme importance. How a surface reflects light, what shape it has, and what colour it is all decide how well you can see a defect. The inspector’s kit then adds mirrors, magnifiers, borescopes, video probes, robots and gauges.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v5',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A flashlight held flat on a shiny table makes a glare. Held low and sideways, it shows every scratch. Lighting is a skill.',
            body: 'Choose the light for the surface. The same defect can be invisible under one light and obvious under another.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Pick the lighting to suit the surface. Specular surfaces are mirror-like. Diffuse surfaces scatter light and look dull. Directional surfaces carry fine grooves. Use coloured or selective filters to improve contrast between a defect and its background.',
              'Mirrors: look inside pipes, threaded holes, hard-to-see places',
              'Magnifiers: surface finish, profile, microstructure',
              'Borescopes: rigid or flexible, closed or inaccessible areas',
              'Video probes and robots: tanks, ducts, pipelines, hazardous spaces',
              'Weld gauges: fillet, height, undercut depth, misalignment',
            ],
            cues: [
              'Choose the light for the surface. The same defect can be invisible under one light and obvious under another.',
            ],
            warnings:
              'Mechanical aids on p.34 are shown as a picture only. Add a written list (thread, pitch and thickness gauges, rules and tapes, angle tools, levels, callipers and micrometers) after trainer confirmation. Confirm the standard weld gauge set used at the plant.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Illumination techniques: front, oblique (light nearly perpendicular to the viewer, good for surface irregularities such as burrs), coaxial (even illumination, reduces shadows and glare), diffuse back illumination (edge contrast, translucent or opaque parts), collimated back illumination and directional front illumination (measuring shadows to calculate heights). Surface geometry: flat, curved and prismatic surfaces each cause different lighting problems.',
            parameters: {
              Mirrors: 'look inside pipes, threaded holes, hard-to-see places',
              Magnifiers: 'surface finish, profile, microstructure',
              Borescopes: 'rigid or flexible, closed or inaccessible areas',
              'Video probes and robots':
                'tanks, ducts, pipelines, hazardous spaces',
              'Weld gauges': 'fillet, height, undercut depth, misalignment',
            },
            standards: ['deck p.23 to p.35'],
            technicalNote:
              'Slides 23 to 35 are picture-heavy. Use the gallery above as your reference sheet.',
          },
        },
        quiz: {
          question:
            'You need small surface bumps such as burrs to show up clearly. Which lighting technique does the deck suggest?',
          context:
            'Lighting is of extreme importance. How a surface reflects light, what shape it has, and what colour it is all decide how well you can see a defect. The inspector’s kit then adds mirrors, magnifiers, borescopes, video probes, robots and gauges.',
          options: [
            {
              id: 'option-0',
              text: 'Diffuse back illumination',
              isCorrect: false,
              explanation:
                'The deck says oblique illumination, with the light source nearly perpendicular to the camera or observer, is used to find surface irregularities such as burrs. Coaxial lighting does the opposite: it evens out the surface and reduces shadows.',
            },
            {
              id: 'option-1',
              text: 'Oblique illumination: light nearly perpendicular to the viewer’s line of sight',
              isCorrect: true,
              explanation:
                'The deck says oblique illumination, with the light source nearly perpendicular to the camera or observer, is used to find surface irregularities such as burrs. Coaxial lighting does the opposite: it evens out the surface and reduces shadows.',
            },
            {
              id: 'option-2',
              text: 'Coaxial illumination',
              isCorrect: false,
              explanation:
                'The deck says oblique illumination, with the light source nearly perpendicular to the camera or observer, is used to find surface irregularities such as burrs. Coaxial lighting does the opposite: it evens out the surface and reduces shadows.',
            },
          ],
          standardReference: 'deck p.23 to p.35',
        },
        practicalTakeaway:
          'Choose the light for the surface. The same defect can be invisible under one light and obvious under another.',
      },
      {
        id: 'v6',
        number: 6,
        title: 'Measure it',
        subtitle: 'MEASURING INSTRUMENTS',
        story:
          'Seeing is not enough. Defects have sizes, and sizes have limits. The inspector’s toolbox runs from thin steel rules to clock gauges that read to a thousandth of a millimetre.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v6',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A ruler for rough sizes, a caliper for finer ones, a micrometer for the finest.',
            body: 'Pick the instrument whose smallest reading is finer than the tolerance you are checking.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Use thin steel rules to reduce parallax error and keep stability. Use tapes for longer distances, checked at a specified temperature and tension. Use vernier calipers, micrometers and clock gauges when you need finer readings.',
              'Steel rule: 0.5 mm or 1/64 in',
              'Tape rule: 1 mm, 1 m to 100 m',
              'Vernier caliper: 0.01 mm or 0.005 in',
              'Micrometer: 0.001 mm or 0.0005 in',
              'Clock gauge: 0.001 mm or 0.00005 in',
            ],
            cues: [
              'Pick the instrument whose smallest reading is finer than the tolerance you are checking.',
            ],
            warnings:
              'Slides 42 to 47 are picture-only. Add captions for each instrument shown. Confirm calibration intervals for each instrument at the plant.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Rules: smallest increment usually 0.5 mm or 1/64 in. Tape rules: steel, painted or engraved, smallest increment usually 1 mm, about 1 m to 100 m long. Vernier calipers: accuracy 0.01 mm or 0.005 in. Micrometers: read to 0.001 mm or 0.0005 in. Clock gauges: some metric ones read to 0.001 mm, imperial to 0.00005 in. Also listed: squares and templates, protractors, internal and external calipers and slip gauges.',
            parameters: {
              'Steel rule': '0.5 mm or 1/64 in',
              'Tape rule': '1 mm, 1 m to 100 m',
              'Vernier caliper': '0.01 mm or 0.005 in',
              Micrometer: '0.001 mm or 0.0005 in',
              'Clock gauge': '0.001 mm or 0.00005 in',
            },
            standards: ['deck p.36 to p.41'],
            technicalNote:
              'The right tool is not the finest one. It is the one finer than your tolerance.',
          },
        },
        quiz: {
          question:
            'You must read a dimension to 0.01 mm. Which of these instruments from the deck fits?',
          context:
            'Seeing is not enough. Defects have sizes, and sizes have limits. The inspector’s toolbox runs from thin steel rules to clock gauges that read to a thousandth of a millimetre.',
          options: [
            {
              id: 'option-0',
              text: 'Steel rule (0.5 mm)',
              isCorrect: false,
              explanation:
                'A vernier caliper reads to 0.01 mm. A steel rule reads to 0.5 mm and a tape rule to 1 mm. A micrometer would also work, with finer reading still (0.001 mm).',
            },
            {
              id: 'option-1',
              text: 'Tape rule (1 mm)',
              isCorrect: false,
              explanation:
                'A vernier caliper reads to 0.01 mm. A steel rule reads to 0.5 mm and a tape rule to 1 mm. A micrometer would also work, with finer reading still (0.001 mm).',
            },
            {
              id: 'option-2',
              text: 'Vernier caliper (0.01 mm)',
              isCorrect: true,
              explanation:
                'A vernier caliper reads to 0.01 mm. A steel rule reads to 0.5 mm and a tape rule to 1 mm. A micrometer would also work, with finer reading still (0.001 mm).',
            },
          ],
          standardReference: 'deck p.36 to p.41',
        },
        practicalTakeaway:
          'Pick the instrument whose smallest reading is finer than the tolerance you are checking.',
      },
      {
        id: 'v7',
        number: 7,
        title: 'Steel defects atlas',
        subtitle: 'VISUAL DEFECTS IN STEEL',
        story:
          'Before a pipe is a pipe, it is steel plate from a mill. The deck lists eleven defects found on steel: sliver, scab, rolled-in scale, roll mark, tong mark, dents or indentation marks, pitting, seam line, lap, lamination and hair line cracks. Plus shell, roll-in bolt and roll-in wire.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v7',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Each defect has a story about how it was born. Knowing the story helps you recognise the picture.',
            body: 'Learn each defect with its origin. The picture and the cause confirm each other.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Match the look to the description. Slivers come from tearing of corners during rolling. Scabs are irregular patches of metal. Rolled-in scale is old scale pressed into the surface. Seam lines are long, shallow grooves. Hair line cracks are internal and need etching or magnetic crack detection to see.',
              'Sliver: tearing of corners during rolling',
              'Scab: irregular patch from mould cavities or loose layers',
              'Rolled-in scale: old scale pressed in during rolling',
              'Seam line: long shallow grooves',
              'Shell: thin film imperfectly attached',
              'Hair cracks: internal, seen by etching or magnetic crack detection',
            ],
            cues: [
              'Learn each defect with its origin. The picture and the cause confirm each other.',
            ],
            warnings:
              'The Roll Mark slide (p.52) repeats the Rolled-in Scale text. Correct the description. Pitting (p.54) is defined as a coating defect inside the steel-defect list. Confirm its place. Tong mark, lap and lamination are listed but have no description slide. Add them. Accept and reject limits for each defect are not in the deck.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Sliver: defective teeming of molten metal and tearing of corners in blooming, roughing or finishing, attributed to causes such as over-oxidation or burning during reheating. Scab: irregular patches from cavities in mould walls or loosely adhering layers. Rolled-in scale: scale formed during a previous heating that was not eliminated in rolling. Seam: long grooves formed by the elongation of oxidised surface or subsurface blow-holes. Shell: a thin film of metal imperfectly attached to the surface. Hair cracks: internal ruptures caused by transformation stresses, hydrogen brittleness and microstructure arrangement.',
            parameters: {
              Sliver: 'tearing of corners during rolling',
              Scab: 'irregular patch from mould cavities or loose layers',
              'Rolled-in scale': 'old scale pressed in during rolling',
              'Seam line': 'long shallow grooves',
              Shell: 'thin film imperfectly attached',
              'Hair cracks':
                'internal, seen by etching or magnetic crack detection',
            },
            standards: ['deck p.48 to p.59'],
            technicalNote:
              'If you cannot tell two defects apart, read their causes. They usually differ.',
          },
        },
        quiz: {
          question:
            'A plate shows irregular patches of metal on its surface, arising from cavities in the mould walls or loosely adhering layers of metal. What is this?',
          context:
            'Before a pipe is a pipe, it is steel plate from a mill. The deck lists eleven defects found on steel: sliver, scab, rolled-in scale, roll mark, tong mark, dents or indentation marks, pitting, seam line, lap, lamination and hair line cracks. Plus shell, roll-in bolt and roll-in wire.',
          options: [
            {
              id: 'option-0',
              text: 'Sliver',
              isCorrect: false,
              explanation:
                'The deck defines a scab as irregular shaped patches of metal on the ingot surface arising from cavities in mould walls or loosely adhering layers of metal. A sliver is tearing of corners in rolling, and a shell is a thin film imperfectly attached.',
            },
            {
              id: 'option-1',
              text: 'Scab',
              isCorrect: true,
              explanation:
                'The deck defines a scab as irregular shaped patches of metal on the ingot surface arising from cavities in mould walls or loosely adhering layers of metal. A sliver is tearing of corners in rolling, and a shell is a thin film imperfectly attached.',
            },
            {
              id: 'option-2',
              text: 'Shell',
              isCorrect: false,
              explanation:
                'The deck defines a scab as irregular shaped patches of metal on the ingot surface arising from cavities in mould walls or loosely adhering layers of metal. A sliver is tearing of corners in rolling, and a shell is a thin film imperfectly attached.',
            },
          ],
          standardReference: 'deck p.48 to p.59',
        },
        practicalTakeaway:
          'Learn each defect with its origin. The picture and the cause confirm each other.',
      },
      {
        id: 'v8',
        number: 8,
        title: 'Pipe-body defects',
        subtitle: 'VISUAL DEFECTS IN PIPE BODY',
        story:
          'A good plate can still become a poor pipe. The deck lists six defects found on the body of a finished pipe: improper grinding, deep grinding, roller mark, chip mark, scratches and mechanical damage, including chisel marks.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v8',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A new car with a scratch. The car was fine in the factory. The damage happened afterwards.',
            body: 'These defects are usually made by handling or finishing, so they can often be prevented.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Use the photos to build your eye. The deck shows each defect as a labelled photograph. Note the position, the length and the shape, because the limits you apply will depend on them.',
              'Defects listed: improper grinding, deep grinding, roller mark, chip mark, scratches, mechanical damage',
              'Shown in deck: photographs with scales',
              'Not in deck: causes and acceptance limits',
            ],
            cues: [
              'These defects are usually made by handling or finishing, so they can often be prevented.',
            ],
            warnings:
              'Slides 61 to 63 carry only a title and a photograph. Add description, cause, measurement method and acceptance limit for each. “Roller mark” and “scratches” appear in the list (p.60) without a photograph slide.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'The deck names the defects and shows photographs with measuring scales, but gives no written description, cause or acceptance limit. This is a gap to close with the trainer: add how each is produced, how it is measured, and the limit that applies.',
            parameters: {
              'Defects listed':
                'improper grinding, deep grinding, roller mark, chip mark, scratches, mechanical damage',
              'Shown in deck': 'photographs with scales',
              'Not in deck': 'causes and acceptance limits',
            },
            standards: ['deck p.60 to p.64'],
            technicalNote: 'A defect you can name is a defect you can report.',
          },
        },
        quiz: {
          question:
            'The deck photograph of a pipe body shows chisel marks. Which of the six pipe-body defect labels does the deck use for it?',
          context:
            'A good plate can still become a poor pipe. The deck lists six defects found on the body of a finished pipe: improper grinding, deep grinding, roller mark, chip mark, scratches and mechanical damage, including chisel marks.',
          options: [
            {
              id: 'option-0',
              text: 'Roller mark',
              isCorrect: false,
              explanation:
                'The deck labels the chisel-mark photograph “Mechanical damage”. Chip marks and roller marks are separate labels with their own photographs.',
            },
            {
              id: 'option-1',
              text: 'Chip mark',
              isCorrect: false,
              explanation:
                'The deck labels the chisel-mark photograph “Mechanical damage”. Chip marks and roller marks are separate labels with their own photographs.',
            },
            {
              id: 'option-2',
              text: 'Mechanical damage',
              isCorrect: true,
              explanation:
                'The deck labels the chisel-mark photograph “Mechanical damage”. Chip marks and roller marks are separate labels with their own photographs.',
            },
          ],
          standardReference: 'deck p.60 to p.64',
        },
        practicalTakeaway:
          'These defects are usually made by handling or finishing, so they can often be prevented.',
      },
      {
        id: 'v9',
        number: 9,
        title: 'Weld defects: cause and defect',
        subtitle: 'WELDING DEFECTS',
        story:
          'The deck lists twenty weld defects, from poor toe blend to distortion. For each, it shows the look and the causes. The good inspector reads the defect backwards to its cause, because that is how a welder fixes it.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v9',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A cracked cake can come from too much heat or too little mixing. Each defect has its own list of causes.',
            body: 'The defect tells you what happened. The cause list tells you what to change.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Start with the features of a good butt weld: cap width, excess weld metal height, root penetration and root bead width, plus profile, toe blend and weld width. Then learn the common defects: root defects, undercut, lack of fusion, porosity, slag, burn-through, spatter, arc strikes, cracks and distortion.',
              'Total defects listed: 20',
              'Root family: incomplete penetration, incomplete fusion, concavity, excess penetration, undercut',
              'Fusion family: lack of fusion, lack of side wall and inter-run fusion',
              'Inclusions: slag, tungsten',
              'Others: burn through, spatter, arc strikes, cracks, distortion',
            ],
            cues: [
              'The defect tells you what happened. The cause list tells you what to change.',
            ],
            warnings:
              'Cause lists are written for general welding processes. Add how each applies to submerged arc welding in the spiral mill. Acceptance limits are not in the deck. Add the limits from the customer specification or API 5L. Pages 70 to 72 repeat incomplete root penetration and 73 repeats the same cause list for incomplete root fusion. Confirm that is intended.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Incomplete root penetration: too small a root gap, arc too long, wrong polarity, electrode too large, incorrect electrode angle, too fast a travel speed for the current. Root concavity: root gap too large, insufficient arc energy, excessive back purge (TIG). Excess root penetration: excessive amperage, excessive root gap, poor fit up, excessive root grinding. Cap undercut: excessive current, speed too high, incorrect electrode angle, excessive weave, electrode too large. Gas pores: moisture in flux or preparation, contaminated preparation, low current, long arc, damaged electrode flux, removal of gas shield. Slag: insufficient cleaning between passes, contaminated preparation, irregular profile, wrong speed, long arc. Spatter: excessive arc energy or length, damp electrodes, arc blow. Arc strikes: electrode straying, poor holder insulation, poor earth clamp contact. Distortion: highly localised heating and cooling.',
            parameters: {
              'Total defects listed': '20',
              'Root family':
                'incomplete penetration, incomplete fusion, concavity, excess penetration, undercut',
              'Fusion family':
                'lack of fusion, lack of side wall and inter-run fusion',
              Inclusions: 'slag, tungsten',
              Others: 'burn through, spatter, arc strikes, cracks, distortion',
            },
            standards: ['deck p.65 to p.90'],
            technicalNote:
              'Several causes repeat across defects (arc too long, root gap). Use the full pattern, not one clue.',
          },
        },
        quiz: {
          question:
            'Which of these is a listed cause of incomplete root penetration in the deck?',
          context:
            'The deck lists twenty weld defects, from poor toe blend to distortion. For each, it shows the look and the causes. The good inspector reads the defect backwards to its cause, because that is how a welder fixes it.',
          options: [
            {
              id: 'option-0',
              text: 'Too fast a speed of travel for the current',
              isCorrect: true,
              explanation:
                'Too fast a travel speed for the current is on the incomplete root penetration list. Excessive back purge belongs to root concavity, and damp electrodes to spatter.',
            },
            {
              id: 'option-1',
              text: 'Excessive back purge (TIG)',
              isCorrect: false,
              explanation:
                'Too fast a travel speed for the current is on the incomplete root penetration list. Excessive back purge belongs to root concavity, and damp electrodes to spatter.',
            },
            {
              id: 'option-2',
              text: 'Damp electrodes',
              isCorrect: false,
              explanation:
                'Too fast a travel speed for the current is on the incomplete root penetration list. Excessive back purge belongs to root concavity, and damp electrodes to spatter.',
            },
          ],
          standardReference: 'deck p.65 to p.90',
        },
        practicalTakeaway:
          'The defect tells you what happened. The cause list tells you what to change.',
      },
      {
        id: 'v10',
        number: 10,
        title: 'Where the eye matters on the coating line',
        subtitle: 'LINKING THE TWO COURSES',
        story:
          'You now know how to look. On the coating line, trained eyes are used at the blast gate, after the quench and at final inspection. The same discipline applies: clean, light, look, measure.',
        diagramType: 'inspection_gates',
        referenceRoute: 'vi-v10',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Same skill, different pipe. What you learned about light, angle and tools works on a coating exactly as it does on steel.',
            body: 'Good inspection habits travel. Light, angle, distance, tools, method.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'At the blast gate: visual cleanliness against ISO 8501-1 and SSPC-VIS 1, with a roughness gauge and a salt meter. After quench: visual and dimensional inspection, with a thickness gauge verified every shift. At final inspection: coating defects, cut back and bevel checks and document verification.',
              'Blast gate: visual grade, roughness, salt, dust',
              'After quench: visual, dimensional, thickness',
              'Final inspection: coating defects, cut back, bevel, documents',
            ],
            cues: [
              'Good inspection habits travel. Light, angle, distance, tools, method.',
            ],
            warnings:
              'Add accept and reject criteria that link the two courses, once confirmed with the TCoE.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Final inspection defects listed in the coating deck: holidays and pinholes, disbonding or delamination, fish eyes and craters, blistering, sagging and drips (3LPE/3LPP), coating damage, surface irregularities, cut back cleaning and length, pipe bevel cleaning, coating bevel shape. Apply the viewing conditions from this course: light level for the standard in force, eye within 600 mm, angle at least 30°.',
            parameters: {
              'Blast gate': 'visual grade, roughness, salt, dust',
              'After quench': 'visual, dimensional, thickness',
              'Final inspection': 'coating defects, cut back, bevel, documents',
            },
            standards: [
              'deck (this course) + Coating deck p.8, p.16, p.21, p.24',
            ],
            technicalNote:
              'Know which atlas you are working from: steel, weld or coating.',
          },
        },
        quiz: {
          question:
            'At final inspection of a coated pipe, which set includes defects the coating deck lists?',
          context:
            'You now know how to look. On the coating line, trained eyes are used at the blast gate, after the quench and at final inspection. The same discipline applies: clean, light, look, measure.',
          options: [
            {
              id: 'option-0',
              text: 'Holidays, disbonding, fish eyes, blistering, sagging',
              isCorrect: true,
              explanation:
                'The first set is the coating deck’s final inspection list. The second is from steel defects and the third from weld defects in this course. Match the defect list to the product you are inspecting.',
            },
            {
              id: 'option-1',
              text: 'Slivers, scabs, lamination, hair cracks',
              isCorrect: false,
              explanation:
                'The first set is the coating deck’s final inspection list. The second is from steel defects and the third from weld defects in this course. Match the defect list to the product you are inspecting.',
            },
            {
              id: 'option-2',
              text: 'Slag, tungsten inclusion, burn through, arc strikes',
              isCorrect: false,
              explanation:
                'The first set is the coating deck’s final inspection list. The second is from steel defects and the third from weld defects in this course. Match the defect list to the product you are inspecting.',
            },
          ],
          standardReference:
            'deck (this course) + Coating deck p.8, p.16, p.21, p.24',
        },
        practicalTakeaway:
          'Good inspection habits travel. Light, angle, distance, tools, method.',
      },
    ],
  },
  {
    id: 'shop-floor-labs',
    code: 'REF-LAB-03',
    title: 'Coating & Inspection Simulation Lab',
    subtitle: 'Six hands-on activities from the shared learning portal',
    description:
      'Practise with the factory twin, 3D layer peeler, inspector optics, metrology bench, defect atlas and shop-floor exam.',
    category: 'Quality & Compliance',
    estimatedMinutes: 60,
    badgeLabel: 'Hands-on lab',
    thumbnailType: 'quality_stamp',
    scenes: [
      {
        id: 'factory',
        number: 1,
        title: 'Factory twin',
        subtitle: 'RECEIVING INSPECTION AND WATER WASH',
        story: 'Follow one pipe through the 20 external coating stations.',
        diagramType: 'inspection_gates',
        referenceRoute: 'lab-factory',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A car wash before a paint job. You rinse the mud and salt off first, then dry it, so the real preparation starts on a clean surface.',
            body: 'Optional on the chart means “as the project specification requires”, not “skip when busy”.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Both flow charts open with receiving inspection, then water wash, which is marked optional (*). Optional means the project specification decides, so check the order before you assume the step is on or off. The same chart shows the NTC re-process loop returning here.',
              'Spray pressure: up to 100 bar',
              'Water temperature: up to 70 °C (if required)',
              'Removes: dust, mud, soluble salts, chlorides',
              'Drying: compressed-air knife',
            ],
            cues: [
              'Optional on the chart means “as the project specification requires”, not “skip when busy”.',
            ],
            warnings:
              'The deck gives no detail for receiving inspection. Add the checks (documents, surface condition, identification) from the ITP. Confirm that the air knife and wash stage have no recorded limits beyond those on the slide.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Spray pressure up to 100 bar, water up to 70 °C if required. The machine is by Initech, S Korea. A high pressure dry compressed-air knife is attached to wipe excess water from the pipe surface. Water wash is optional on both the 3LPE/3LPP and the FBE/DFBE chart.',
            parameters: {
              'Spray pressure': 'up to 100 bar',
              'Water temperature': 'up to 70 °C (if required)',
              Removes: 'dust, mud, soluble salts, chlorides',
              Drying: 'compressed-air knife',
            },
            standards: ['deck p.4, p.5, p.6'],
            technicalNote:
              'Learn to read the asterisk. Two charts, two different optional lists.',
          },
        },
        quiz: {
          question:
            'Looking at the two flow charts, which early station is marked optional on BOTH the 3LPE/3LPP chart and the FBE/DFBE chart?',
          context:
            'The pipe is checked at receiving inspection, then rolls into a high pressure hot water wash. The wash takes off what blasting would otherwise have to fight: loose dust, mud, soluble salts and chlorides. An air knife wipes the water off before the pipe moves on.',
          options: [
            {
              id: 'option-0',
              text: 'Receiving inspection',
              isCorrect: false,
              explanation:
                'Water wash carries the asterisk on both charts. Preheating is starred only on the 3LPE/3LPP chart; on the FBE/DFBE chart it is a standard station. The footnote on both says optional stations apply as per project specification requirements.',
            },
            {
              id: 'option-1',
              text: 'Water wash',
              isCorrect: true,
              explanation:
                'Water wash carries the asterisk on both charts. Preheating is starred only on the 3LPE/3LPP chart; on the FBE/DFBE chart it is a standard station. The footnote on both says optional stations apply as per project specification requirements.',
            },
            {
              id: 'option-2',
              text: 'Preheating',
              isCorrect: false,
              explanation:
                'Water wash carries the asterisk on both charts. Preheating is starred only on the 3LPE/3LPP chart; on the FBE/DFBE chart it is a standard station. The footnote on both says optional stations apply as per project specification requirements.',
            },
          ],
          standardReference: 'deck p.4, p.5, p.6',
        },
        practicalTakeaway:
          'Optional on the chart means “as the project specification requires”, not “skip when busy”.',
      },
      {
        id: 'peeler',
        number: 2,
        title: '3D layer peeler',
        subtitle: 'ADHESIVE, PE / PP AND SEAM SYSTEM',
        story: 'Build and inspect the epoxy, adhesive and topcoat layers.',
        diagramType: 'inspection_gates',
        referenceRoute: 'lab-peeler',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A sandwich: epoxy bread, adhesive spread, and a thick outer slice. The seam gets an extra smear because the bump would otherwise be thin.',
            body: 'The weld seam system exists to prevent low thickness on the seam without thickening the whole pipe.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Dryers take moisture out of the granules before they melt. If the body reads fine but the weld seam reads thin, go to the weld seam system first: laser seam detection and the hydraulic plunger.',
              'Adhesive extruder: 250 kg/hr, 400 mm T-die',
              'PE/PP extruders: 2 × 1200 kg/hr, 1200 mm T-die',
              'Seam detection: laser sensors + PLC',
              'Seam coating: hydraulic plunger over the bead',
              'Application: press-on roller from the top',
            ],
            cues: [
              'The weld seam system exists to prevent low thickness on the seam without thickening the whole pipe.',
            ],
            warnings:
              'The deck gives no thickness limits for the adhesive and PE/PP layers. Add them. The deck says “molten HDPE” for the seam. Confirm whether PP pipes use a different material.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Adhesive extruder Ø110 mm, L/D 30, 250 kg/hr, 150 kW drive, 6 to 60 RPM, 400 mm T-die. PE/PP extruders: two Ø200 mm, L/D 32 (the deck prints “Ration”), 2 × 1200 kg/hr, 2 × 750 kW drives, 6 to 70 RPM, common 1200 mm T-die. Seam system: TKPS, Netherlands.',
            parameters: {
              'Adhesive extruder': '250 kg/hr, 400 mm T-die',
              'PE/PP extruders': '2 × 1200 kg/hr, 1200 mm T-die',
              'Seam detection': 'laser sensors + PLC',
              'Seam coating': 'hydraulic plunger over the bead',
              Application: 'press-on roller from the top',
            },
            standards: ['deck p.13, p.14'],
            technicalNote:
              'A thin seam is a typical failure point. Know the system that is built to prevent it.',
          },
        },
        quiz: {
          question:
            'Thickness on the pipe body is fine, but readings right on top of the weld seam are low. Which system do you check first?',
          context:
            'Two extruders feed through flat T-dies: a small one for the adhesive and two large ones for the polyethylene or polypropylene topcoat. A press-on roller smooths the layers onto the pipe. On a spiral pipe, a laser finds the raised weld seam and a plunger pushes extra molten coating over it.',
          options: [
            {
              id: 'option-0',
              text: 'The induction heater',
              isCorrect: false,
              explanation:
                'The seam system is built to prevent low coating thickness over the weld seam. The induction heater warms the whole pipe and the quench cools it; neither adds coating to the seam.',
            },
            {
              id: 'option-1',
              text: 'The weld seam system: laser detection and the hydraulic plunger',
              isCorrect: true,
              explanation:
                'The seam system is built to prevent low coating thickness over the weld seam. The induction heater warms the whole pipe and the quench cools it; neither adds coating to the seam.',
            },
            {
              id: 'option-2',
              text: 'The quench troughs',
              isCorrect: false,
              explanation:
                'The seam system is built to prevent low coating thickness over the weld seam. The induction heater warms the whole pipe and the quench cools it; neither adds coating to the seam.',
            },
          ],
          standardReference: 'deck p.13, p.14',
        },
        practicalTakeaway:
          'The weld seam system exists to prevent low thickness on the seam without thickening the whole pipe.',
      },
      {
        id: 'optics',
        number: 3,
        title: 'Inspector optics',
        subtitle: 'CONDITIONS FOR VISUAL INSPECTION',
        story: 'Adjust distance, viewing angle and light to inspect a surface.',
        diagramType: 'inspection_gates',
        referenceRoute: 'lab-optics',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'You cannot read a book in the dark with your nose against the page. The inspector needs enough light, a sensible distance and a good angle.',
            body: 'Different standards ask for different light. Your contract decides which number applies.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Clean the surface. Check the light. Keep your eye within 600 mm of the surface at an angle of at least 30° (ASME Sec V, Art. 9). Use a magnifier if required. The test is judged adequate if you can resolve a 0.8 mm wide black line on an artificial flaw on the surface.',
              'Eye distance: within 600 mm',
              'Viewing angle: 30° or more',
              'Light (ASME V Art. 9): 350 lux min, over 500 recommended',
              'Light (API 5L, 45th ed.): 300 lux min',
              'Light (ASME V / API 5LD): 1000 lux min',
              'Resolve: a 0.8 mm black line',
              'Near vision: Jaeger No. 2 at ≥12 in, annual',
              'Colour vision: every 5 years',
            ],
            cues: [
              'Different standards ask for different light. Your contract decides which number applies.',
            ],
            warnings:
              'The deck gives four different light levels across standards. Confirm which applies to each product and customer. The deck says the near vision test uses Jaeger No. 2 at 12 inches. Confirm the current SNT-TC-1A wording used at the plant.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Illumination depends on the standard: at least 300 lux per API 5L 45th edition, at least 1000 lux per ASME Sec V and API 5LD, and at least 350 lux (500 or more recommended) per ASME Sec V Art. 9. Inspectors must read a Jaeger No. 2 chart (or equivalent) at not less than 12 inches, tested annually, and be tested for colour vision every 5 years, as specified in ASNT SNT-TC-1A.',
            parameters: {
              'Eye distance': 'within 600 mm',
              'Viewing angle': '30° or more',
              'Light (ASME V Art. 9)': '350 lux min, over 500 recommended',
              'Light (API 5L, 45th ed.)': '300 lux min',
              'Light (ASME V / API 5LD)': '1000 lux min',
              Resolve: 'a 0.8 mm black line',
              'Near vision': 'Jaeger No. 2 at ≥12 in, annual',
              'Colour vision': 'every 5 years',
            },
            standards: ['deck p.12 to p.16'],
            technicalNote:
              'Never quote “the” lux level. Quote the lux level for the standard in force.',
          },
        },
        quiz: {
          question:
            'Your contract calls up API 5L, 45th edition. What is the minimum illumination on the surface according to the deck?',
          context:
            'A clean, comfortable, well-lit place with reasonable access. A test piece free of coatings, oil and grease. Calibrated equipment the inspector understands. And the eye at the right distance and angle, under enough light to resolve a very fine line.',
          options: [
            {
              id: 'option-0',
              text: 'At least 300 lux',
              isCorrect: true,
              explanation:
                'The deck gives at least 300 lux for API 5L 45th edition. It gives 1000 lux for ASME Sec V and API 5LD, and 350 lux (500 recommended) for ASME Sec V Art. 9. Always check which standard your contract names.',
            },
            {
              id: 'option-1',
              text: 'At least 350 lux',
              isCorrect: false,
              explanation:
                'The deck gives at least 300 lux for API 5L 45th edition. It gives 1000 lux for ASME Sec V and API 5LD, and 350 lux (500 recommended) for ASME Sec V Art. 9. Always check which standard your contract names.',
            },
            {
              id: 'option-2',
              text: 'At least 1000 lux',
              isCorrect: false,
              explanation:
                'The deck gives at least 300 lux for API 5L 45th edition. It gives 1000 lux for ASME Sec V and API 5LD, and 350 lux (500 recommended) for ASME Sec V Art. 9. Always check which standard your contract names.',
            },
          ],
          standardReference: 'deck p.12 to p.16',
        },
        practicalTakeaway:
          'Different standards ask for different light. Your contract decides which number applies.',
      },
      {
        id: 'bench',
        number: 4,
        title: 'Metrology bench',
        subtitle: 'MEASURING INSTRUMENTS',
        story: 'Choose a measuring instrument and practise reading a vernier.',
        diagramType: 'inspection_gates',
        referenceRoute: 'lab-bench',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A ruler for rough sizes, a caliper for finer ones, a micrometer for the finest.',
            body: 'Pick the instrument whose smallest reading is finer than the tolerance you are checking.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Use thin steel rules to reduce parallax error and keep stability. Use tapes for longer distances, checked at a specified temperature and tension. Use vernier calipers, micrometers and clock gauges when you need finer readings.',
              'Steel rule: 0.5 mm or 1/64 in',
              'Tape rule: 1 mm, 1 m to 100 m',
              'Vernier caliper: 0.01 mm or 0.005 in',
              'Micrometer: 0.001 mm or 0.0005 in',
              'Clock gauge: 0.001 mm or 0.00005 in',
            ],
            cues: [
              'Pick the instrument whose smallest reading is finer than the tolerance you are checking.',
            ],
            warnings:
              'Slides 42 to 47 are picture-only. Add captions for each instrument shown. Confirm calibration intervals for each instrument at the plant.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Rules: smallest increment usually 0.5 mm or 1/64 in. Tape rules: steel, painted or engraved, smallest increment usually 1 mm, about 1 m to 100 m long. Vernier calipers: accuracy 0.01 mm or 0.005 in. Micrometers: read to 0.001 mm or 0.0005 in. Clock gauges: some metric ones read to 0.001 mm, imperial to 0.00005 in. Also listed: squares and templates, protractors, internal and external calipers and slip gauges.',
            parameters: {
              'Steel rule': '0.5 mm or 1/64 in',
              'Tape rule': '1 mm, 1 m to 100 m',
              'Vernier caliper': '0.01 mm or 0.005 in',
              Micrometer: '0.001 mm or 0.0005 in',
              'Clock gauge': '0.001 mm or 0.00005 in',
            },
            standards: ['deck p.36 to p.41'],
            technicalNote:
              'The right tool is not the finest one. It is the one finer than your tolerance.',
          },
        },
        quiz: {
          question:
            'You must read a dimension to 0.01 mm. Which of these instruments from the deck fits?',
          context:
            'Seeing is not enough. Defects have sizes, and sizes have limits. The inspector’s toolbox runs from thin steel rules to clock gauges that read to a thousandth of a millimetre.',
          options: [
            {
              id: 'option-0',
              text: 'Steel rule (0.5 mm)',
              isCorrect: false,
              explanation:
                'A vernier caliper reads to 0.01 mm. A steel rule reads to 0.5 mm and a tape rule to 1 mm. A micrometer would also work, with finer reading still (0.001 mm).',
            },
            {
              id: 'option-1',
              text: 'Tape rule (1 mm)',
              isCorrect: false,
              explanation:
                'A vernier caliper reads to 0.01 mm. A steel rule reads to 0.5 mm and a tape rule to 1 mm. A micrometer would also work, with finer reading still (0.001 mm).',
            },
            {
              id: 'option-2',
              text: 'Vernier caliper (0.01 mm)',
              isCorrect: true,
              explanation:
                'A vernier caliper reads to 0.01 mm. A steel rule reads to 0.5 mm and a tape rule to 1 mm. A micrometer would also work, with finer reading still (0.001 mm).',
            },
          ],
          standardReference: 'deck p.36 to p.41',
        },
        practicalTakeaway:
          'Pick the instrument whose smallest reading is finer than the tolerance you are checking.',
      },
      {
        id: 'atlas',
        number: 5,
        title: 'Defect atlas',
        subtitle: 'WELDING DEFECTS',
        story: 'Explore cross-sections of weld, steel and pipe-body defects.',
        diagramType: 'inspection_gates',
        referenceRoute: 'lab-atlas',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'A cracked cake can come from too much heat or too little mixing. Each defect has its own list of causes.',
            body: 'The defect tells you what happened. The cause list tells you what to change.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'Start with the features of a good butt weld: cap width, excess weld metal height, root penetration and root bead width, plus profile, toe blend and weld width. Then learn the common defects: root defects, undercut, lack of fusion, porosity, slag, burn-through, spatter, arc strikes, cracks and distortion.',
              'Total defects listed: 20',
              'Root family: incomplete penetration, incomplete fusion, concavity, excess penetration, undercut',
              'Fusion family: lack of fusion, lack of side wall and inter-run fusion',
              'Inclusions: slag, tungsten',
              'Others: burn through, spatter, arc strikes, cracks, distortion',
            ],
            cues: [
              'The defect tells you what happened. The cause list tells you what to change.',
            ],
            warnings:
              'Cause lists are written for general welding processes. Add how each applies to submerged arc welding in the spiral mill. Acceptance limits are not in the deck. Add the limits from the customer specification or API 5L. Pages 70 to 72 repeat incomplete root penetration and 73 repeats the same cause list for incomplete root fusion. Confirm that is intended.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Incomplete root penetration: too small a root gap, arc too long, wrong polarity, electrode too large, incorrect electrode angle, too fast a travel speed for the current. Root concavity: root gap too large, insufficient arc energy, excessive back purge (TIG). Excess root penetration: excessive amperage, excessive root gap, poor fit up, excessive root grinding. Cap undercut: excessive current, speed too high, incorrect electrode angle, excessive weave, electrode too large. Gas pores: moisture in flux or preparation, contaminated preparation, low current, long arc, damaged electrode flux, removal of gas shield. Slag: insufficient cleaning between passes, contaminated preparation, irregular profile, wrong speed, long arc. Spatter: excessive arc energy or length, damp electrodes, arc blow. Arc strikes: electrode straying, poor holder insulation, poor earth clamp contact. Distortion: highly localised heating and cooling.',
            parameters: {
              'Total defects listed': '20',
              'Root family':
                'incomplete penetration, incomplete fusion, concavity, excess penetration, undercut',
              'Fusion family':
                'lack of fusion, lack of side wall and inter-run fusion',
              Inclusions: 'slag, tungsten',
              Others: 'burn through, spatter, arc strikes, cracks, distortion',
            },
            standards: ['deck p.65 to p.90'],
            technicalNote:
              'Several causes repeat across defects (arc too long, root gap). Use the full pattern, not one clue.',
          },
        },
        quiz: {
          question:
            'Which of these is a listed cause of incomplete root penetration in the deck?',
          context:
            'The deck lists twenty weld defects, from poor toe blend to distortion. For each, it shows the look and the causes. The good inspector reads the defect backwards to its cause, because that is how a welder fixes it.',
          options: [
            {
              id: 'option-0',
              text: 'Too fast a speed of travel for the current',
              isCorrect: true,
              explanation:
                'Too fast a travel speed for the current is on the incomplete root penetration list. Excessive back purge belongs to root concavity, and damp electrodes to spatter.',
            },
            {
              id: 'option-1',
              text: 'Excessive back purge (TIG)',
              isCorrect: false,
              explanation:
                'Too fast a travel speed for the current is on the incomplete root penetration list. Excessive back purge belongs to root concavity, and damp electrodes to spatter.',
            },
            {
              id: 'option-2',
              text: 'Damp electrodes',
              isCorrect: false,
              explanation:
                'Too fast a travel speed for the current is on the incomplete root penetration list. Excessive back purge belongs to root concavity, and damp electrodes to spatter.',
            },
          ],
          standardReference: 'deck p.65 to p.90',
        },
        practicalTakeaway:
          'The defect tells you what happened. The cause list tells you what to change.',
      },
      {
        id: 'exam',
        number: 6,
        title: 'Shop-floor exam',
        subtitle: 'LINKING THE TWO COURSES',
        story: 'Apply coating and inspection knowledge to eight scenarios.',
        diagramType: 'inspection_gates',
        referenceRoute: 'lab-exam',
        explanations: {
          eli5: {
            title: 'The idea made simple',
            analogy:
              'Same skill, different pipe. What you learned about light, angle and tools works on a coating exactly as it does on steel.',
            body: 'Good inspection habits travel. Light, angle, distance, tools, method.',
          },
          operator: {
            title: 'At your station',
            checkpoints: [
              'At the blast gate: visual cleanliness against ISO 8501-1 and SSPC-VIS 1, with a roughness gauge and a salt meter. After quench: visual and dimensional inspection, with a thickness gauge verified every shift. At final inspection: coating defects, cut back and bevel checks and document verification.',
              'Blast gate: visual grade, roughness, salt, dust',
              'After quench: visual, dimensional, thickness',
              'Final inspection: coating defects, cut back, bevel, documents',
            ],
            cues: [
              'Good inspection habits travel. Light, angle, distance, tools, method.',
            ],
            warnings:
              'Add accept and reject criteria that link the two courses, once confirmed with the TCoE.',
          },
          engineer: {
            title: 'Technical background',
            specifications:
              'Final inspection defects listed in the coating deck: holidays and pinholes, disbonding or delamination, fish eyes and craters, blistering, sagging and drips (3LPE/3LPP), coating damage, surface irregularities, cut back cleaning and length, pipe bevel cleaning, coating bevel shape. Apply the viewing conditions from this course: light level for the standard in force, eye within 600 mm, angle at least 30°.',
            parameters: {
              'Blast gate': 'visual grade, roughness, salt, dust',
              'After quench': 'visual, dimensional, thickness',
              'Final inspection': 'coating defects, cut back, bevel, documents',
            },
            standards: [
              'deck (this course) + Coating deck p.8, p.16, p.21, p.24',
            ],
            technicalNote:
              'Know which atlas you are working from: steel, weld or coating.',
          },
        },
        quiz: {
          question:
            'At final inspection of a coated pipe, which set includes defects the coating deck lists?',
          context:
            'You now know how to look. On the coating line, trained eyes are used at the blast gate, after the quench and at final inspection. The same discipline applies: clean, light, look, measure.',
          options: [
            {
              id: 'option-0',
              text: 'Holidays, disbonding, fish eyes, blistering, sagging',
              isCorrect: true,
              explanation:
                'The first set is the coating deck’s final inspection list. The second is from steel defects and the third from weld defects in this course. Match the defect list to the product you are inspecting.',
            },
            {
              id: 'option-1',
              text: 'Slivers, scabs, lamination, hair cracks',
              isCorrect: false,
              explanation:
                'The first set is the coating deck’s final inspection list. The second is from steel defects and the third from weld defects in this course. Match the defect list to the product you are inspecting.',
            },
            {
              id: 'option-2',
              text: 'Slag, tungsten inclusion, burn through, arc strikes',
              isCorrect: false,
              explanation:
                'The first set is the coating deck’s final inspection list. The second is from steel defects and the third from weld defects in this course. Match the defect list to the product you are inspecting.',
            },
          ],
          standardReference:
            'deck (this course) + Coating deck p.8, p.16, p.21, p.24',
        },
        practicalTakeaway:
          'Good inspection habits travel. Light, angle, distance, tools, method.',
      },
    ],
  },
];
