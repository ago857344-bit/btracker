export interface FormulaItem {
	id: string;
	title: string;
	latex: string;
	description?: string;
	subject: 'P' | 'C' | 'M';
	chapterName: string;
	tags: string[];
	important?: boolean;
}

export const JEE_FORMULAS: FormulaItem[] = [
	{
		"id": "p-units-1",
		"title": "Propagation of Errors",
		"latex": "\\frac{\\Delta Z}{Z} = a\\frac{\\Delta A}{A} + b\\frac{\\Delta B}{B} + c\\frac{\\Delta C}{C}",
		"description": "For Z = (A^a * B^b) / C^c, fractional errors add with their respective powers.",
		"subject": "P",
		"chapterName": "Units and Measurements",
		"tags": [
			"errors",
			"fractional-error",
			"measurements",
			"dimensions"
		],
		"important": true
	},
	{
		"id": "p-units-2",
		"title": "Least Count of Instruments",
		"latex": "\\text{LC}_{vernier} = 1\\text{ MSD} - 1\\text{ VSD}, \\quad \\text{LC}_{screw} = \\frac{\\text{Pitch}}{\\text{Total Circular Divisions}}",
		"description": "Vernier callipers and screw gauge precision formulas.",
		"subject": "P",
		"chapterName": "Units and Measurements",
		"tags": [
			"least-count",
			"vernier",
			"screw-gauge",
			"precision"
		],
		"important": true
	},
	{
		"id": "p-kin-1",
		"title": "Equations of Motion (Constant Acceleration)",
		"latex": "v = u + at, \\quad s = ut + \\frac{1}{2}at^2, \\quad v^2 = u^2 + 2as, \\quad s_n = u + \\frac{a}{2}(2n - 1)",
		"description": "Kinematic formulas strictly valid when acceleration is constant.",
		"subject": "P",
		"chapterName": "Motion in a Straight Line",
		"tags": [
			"kinematics",
			"velocity",
			"displacement",
			"acceleration",
			"1d"
		],
		"important": true
	},
	{
		"id": "p-kin-2",
		"title": "Stopping Distance & Reaction Time",
		"latex": "d_s = \\frac{u^2}{2a}, \\quad d_{total} = u\\cdot t_r + \\frac{u^2}{2a}",
		"description": "Distance covered before coming to rest with retardation a and driver reaction time t_r.",
		"subject": "P",
		"chapterName": "Motion in a Straight Line",
		"tags": [
			"stopping-distance",
			"reaction-time",
			"retardation"
		],
		"important": false
	},
	{
		"id": "p-proj-1",
		"title": "Projectile Motion on Horizontal Plane",
		"latex": "T = \\frac{2u\\sin\\theta}{g}, \\quad H = \\frac{u^2\\sin^2\\theta}{2g}, \\quad R = \\frac{u^2\\sin 2\\theta}{g}",
		"description": "Time of flight, maximum vertical height, and horizontal range for 2D projectile motion.",
		"subject": "P",
		"chapterName": "Motion in a Plane",
		"tags": [
			"projectile",
			"flight-time",
			"range",
			"height",
			"2d"
		],
		"important": true
	},
	{
		"id": "p-proj-2",
		"title": "Trajectory Equation & Range Relation",
		"latex": "y = x\\tan\\theta - \\frac{g x^2}{2u^2\\cos^2\\theta} = x\\tan\\theta\\left(1 - \\frac{x}{R}\\right)",
		"description": "Parabolic path equation in terms of horizontal range R.",
		"subject": "P",
		"chapterName": "Motion in a Plane",
		"tags": [
			"trajectory",
			"parabola",
			"projectile",
			"range"
		],
		"important": true
	},
	{
		"id": "p-plane-3",
		"title": "Uniform Circular Motion & Centripetal Acceleration",
		"latex": "a_c = \\frac{v^2}{R} = \\omega^2 R = v\\omega, \\quad a_{net} = \\sqrt{a_c^2 + a_t^2}",
		"description": "Radial (centripetal) acceleration towards center, and total acceleration with tangential component a_t = dv/dt.",
		"subject": "P",
		"chapterName": "Motion in a Plane",
		"tags": [
			"circular-motion",
			"centripetal",
			"radial-acceleration"
		],
		"important": true
	},
	{
		"id": "p-nlm-1",
		"title": "Newton's Second Law & Momentum Impulse",
		"latex": "\\vec{F}_{ext} = \\frac{d\\vec{p}}{dt} = m\\vec{a}_{cm}, \\quad \\vec{J} = \\int \\vec{F}\\,dt = \\Delta\\vec{p}",
		"description": "Impulse equals total change in linear momentum.",
		"subject": "P",
		"chapterName": "Laws of Motion",
		"tags": [
			"force",
			"impulse",
			"momentum",
			"newton"
		],
		"important": true
	},
	{
		"id": "p-nlm-2",
		"title": "Static & Kinetic Friction Laws",
		"latex": "f_s \\le \\mu_s N, \\quad f_k = \\mu_k N, \\quad \\mu_s > \\mu_k",
		"description": "Limiting friction is proportional to normal reaction. Friction opposes relative impending motion.",
		"subject": "P",
		"chapterName": "Laws of Motion",
		"tags": [
			"friction",
			"normal-force",
			"limiting-friction"
		],
		"important": true
	},
	{
		"id": "p-nlm-3",
		"title": "Banking of Curved Roads",
		"latex": "v_{opt} = \\sqrt{R g \\tan\\theta}, \\quad v_{max} = \\sqrt{R g \\left(\\frac{\\tan\\theta + \\mu}{1 - \\mu\\tan\\theta}\\right)}",
		"description": "Optimum speed without wear and maximum safe speed on banked curve with friction coefficient mu.",
		"subject": "P",
		"chapterName": "Laws of Motion",
		"tags": [
			"banking",
			"circular-motion",
			"friction",
			"safe-speed"
		],
		"important": true
	},
	{
		"id": "p-wpe-1",
		"title": "Work-Energy Theorem & Power",
		"latex": "W_{all} = \\Delta K = K_f - K_i, \\quad P = \\vec{F}\\cdot\\vec{v} = \\frac{dW}{dt}",
		"description": "Net work done by all forces (conservative, non-conservative, and pseudo) equals change in kinetic energy.",
		"subject": "P",
		"chapterName": "Work, Energy and Power",
		"tags": [
			"work-energy",
			"kinetic-energy",
			"power"
		],
		"important": true
	},
	{
		"id": "p-wpe-2",
		"title": "Potential Energy & Conservative Forces",
		"latex": "F_x = -\\frac{dU}{dx}, \\quad \\vec{F} = -\\vec{\\nabla} U, \\quad W_c = -\\Delta U",
		"description": "Force is negative gradient of potential energy. Stable equilibrium occurs where d^2U/dx^2 > 0.",
		"subject": "P",
		"chapterName": "Work, Energy and Power",
		"tags": [
			"potential-energy",
			"equilibrium",
			"conservative-force"
		],
		"important": true
	},
	{
		"id": "p-wpe-3",
		"title": "Vertical Circular Motion Critical Velocities",
		"latex": "v_{bottom} \\ge \\sqrt{5gR}, \\quad v_{top} \\ge \\sqrt{gR}, \\quad T_{bottom} - T_{top} = 6mg",
		"description": "Critical conditions for a mass on a string to complete vertical circular loop.",
		"subject": "P",
		"chapterName": "Work, Energy and Power",
		"tags": [
			"vertical-circle",
			"tension",
			"critical-speed"
		],
		"important": true
	},
	{
		"id": "p-rot-1",
		"title": "Center of Mass Coordinates",
		"latex": "\\vec{R}_{cm} = \\frac{\\sum m_i \\vec{r}_i}{\\sum m_i} = \\frac{\\int \\vec{r}\\,dm}{\\int dm}",
		"description": "Center of mass position vector for discrete and continuous bodies.",
		"subject": "P",
		"chapterName": "System of Particles and Rotational Motion",
		"tags": [
			"center-of-mass",
			"mass-distribution",
			"com"
		],
		"important": true
	},
	{
		"id": "p-rot-2",
		"title": "Parallel & Perpendicular Axis Theorems",
		"latex": "I = I_{cm} + M d^2, \\quad I_z = I_x + I_y \\quad \\text{(Planar 2D bodies)}",
		"description": "Parallel axis theorem applies to all bodies; perpendicular axis theorem applies only to flat laminas.",
		"subject": "P",
		"chapterName": "System of Particles and Rotational Motion",
		"tags": [
			"moment-of-inertia",
			"parallel-axis",
			"rotation"
		],
		"important": true
	},
	{
		"id": "p-rot-3",
		"title": "Torque, Angular Momentum & Rolling Acceleration",
		"latex": "\\vec{\\tau} = I\\vec{\\alpha} = \\frac{d\\vec{L}}{dt}, \\quad a_{incline} = \\frac{g\\sin\\theta}{1 + \\frac{k^2}{R^2}}, \\quad K_{roll} = \\frac{1}{2}M v^2\\left(1 + \\frac{k^2}{R^2}\\right)",
		"description": "Pure rolling without slipping down an inclined plane. k is radius of gyration.",
		"subject": "P",
		"chapterName": "System of Particles and Rotational Motion",
		"tags": [
			"torque",
			"angular-momentum",
			"pure-rolling",
			"gyration"
		],
		"important": true
	},
	{
		"id": "p-grav-1",
		"title": "Gravitational Force & Variation of g",
		"latex": "F = \\frac{G M m}{r^2}, \\quad g(h) \\approx g\\left(1 - \\frac{2h}{R}\\right), \\quad g(d) = g\\left(1 - \\frac{d}{R}\\right)",
		"description": "Acceleration due to gravity at altitude h (for h << R) and at depth d below Earth surface.",
		"subject": "P",
		"chapterName": "Gravitation",
		"tags": [
			"gravitation",
			"gravity",
			"altitude",
			"depth"
		],
		"important": true
	},
	{
		"id": "p-grav-2",
		"title": "Escape & Orbital Speeds, Kepler’s Law",
		"latex": "v_e = \\sqrt{\\frac{2GM}{R}} = \\sqrt{2gR}, \\quad v_o = \\sqrt{\\frac{GM}{R}}, \\quad T^2 = \\frac{4\\pi^2}{GM}r^3",
		"description": "Escape velocity is sqrt(2) times orbital velocity at Earth surface (approx 11.2 km/s).",
		"subject": "P",
		"chapterName": "Gravitation",
		"tags": [
			"escape-velocity",
			"orbital-speed",
			"kepler",
			"period"
		],
		"important": true
	},
	{
		"id": "p-sol-1",
		"title": "Hooke's Law & Elastic Moduli",
		"latex": "Y = \\frac{F/A}{\\Delta L/L}, \\quad B = -V\\frac{\\Delta P}{\\Delta V}, \\quad \\eta = \\frac{F/A}{\\theta}, \\quad u = \\frac{1}{2}\\sigma\\epsilon = \\frac{\\sigma^2}{2Y}",
		"description": "Young modulus Y, bulk modulus B, shear modulus eta, and elastic strain energy density u.",
		"subject": "P",
		"chapterName": "Mechanical Properties of Solids",
		"tags": [
			"elasticity",
			"hooke",
			"youngs-modulus",
			"strain-energy"
		],
		"important": true
	},
	{
		"id": "p-fluid-1",
		"title": "Bernoulli's Equation & Continuity",
		"latex": "A_1 v_1 = A_2 v_2, \\quad P + \\frac{1}{2}\\rho v^2 + \\rho g h = \\text{constant}, \\quad v_{efflux} = \\sqrt{2gh}",
		"description": "Equation of continuity for incompressible flow, Bernoulli conservation of energy, and Torricelli velocity.",
		"subject": "P",
		"chapterName": "Mechanical Properties of Fluids",
		"tags": [
			"bernoulli",
			"continuity",
			"efflux",
			"hydrodynamics"
		],
		"important": true
	},
	{
		"id": "p-fluid-2",
		"title": "Stokes' Law, Terminal Velocity & Capillarity",
		"latex": "F_v = 6\\pi\\eta r v, \\quad v_t = \\frac{2}{9}\\frac{r^2(\\rho - \\sigma)g}{\\eta}, \\quad h = \\frac{2T\\cos\\theta}{\\rho g r}",
		"description": "Viscous drag on sphere, terminal settling velocity, and capillary ascent in tube with surface tension T.",
		"subject": "P",
		"chapterName": "Mechanical Properties of Fluids",
		"tags": [
			"viscosity",
			"stokes",
			"terminal-velocity",
			"surface-tension",
			"capillary"
		],
		"important": true
	},
	{
		"id": "p-thm-1",
		"title": "Heat Conduction & Stefan-Boltzmann Law",
		"latex": "\\frac{dQ}{dt} = \\frac{k A(T_1 - T_2)}{L}, \\quad P = e\\sigma A (T^4 - T_0^4), \\quad \\lambda_m T = b",
		"description": "Thermal conduction, Stefan radiation power to surroundings at T_0, and Wien displacement law (b = 2.898 x 10^-3 m K).",
		"subject": "P",
		"chapterName": "Thermal Properties of Matter",
		"tags": [
			"heat-transfer",
			"conduction",
			"radiation",
			"stefan",
			"wien"
		],
		"important": true
	},
	{
		"id": "p-td-1",
		"title": "First Law of Thermodynamics & Work Done",
		"latex": "\\Delta Q = \\Delta U + W, \\quad W_{iso} = nRT\\ln\\left(\\frac{V_2}{V_1}\\right), \\quad W_{adi} = \\frac{P_1 V_1 - P_2 V_2}{\\gamma - 1} = \\frac{nR(T_1 - T_2)}{\\gamma - 1}",
		"description": "Internal energy depends only on temperature: Delta U = n * Cv * Delta T. Isobaric work W = P * Delta V.",
		"subject": "P",
		"chapterName": "Thermodynamics",
		"tags": [
			"thermodynamics",
			"first-law",
			"work",
			"isothermal",
			"adiabatic"
		],
		"important": true
	},
	{
		"id": "p-td-2",
		"title": "Carnot Heat Engine & Refrigerator",
		"latex": "\\eta = 1 - \\frac{T_C}{T_H} = \\frac{W}{Q_H}, \\quad \\beta = \\frac{Q_C}{W} = \\frac{T_C}{T_H - T_C}",
		"description": "Maximum efficiency of heat engine and coefficient of performance beta of refrigerator operating between TH and TC.",
		"subject": "P",
		"chapterName": "Thermodynamics",
		"tags": [
			"carnot",
			"efficiency",
			"cop",
			"refrigerator"
		],
		"important": true
	},
	{
		"id": "p-ktg-1",
		"title": "Kinetic Gas Theory Speeds & Equipartition",
		"latex": "v_{rms} = \\sqrt{\\frac{3RT}{M}}, \\quad v_{avg} = \\sqrt{\\frac{8RT}{\\pi M}}, \\quad v_{mp} = \\sqrt{\\frac{2RT}{M}}, \\quad C_v = \\frac{f}{2}R, \\quad \\gamma = 1 + \\frac{2}{f}",
		"description": "Molecular speeds in order: v_rms > v_avg > v_mp. Degrees of freedom f = 3 (monoatomic), 5 (diatomic rigid).",
		"subject": "P",
		"chapterName": "Kinetic Theory",
		"tags": [
			"ktg",
			"rms-speed",
			"degrees-of-freedom",
			"gamma"
		],
		"important": true
	},
	{
		"id": "p-ktg-2",
		"title": "Mean Free Path of Gas Molecules",
		"latex": "\\lambda = \\frac{1}{\\sqrt{2}\\pi d^2 n} = \\frac{k_B T}{\\sqrt{2}\\pi d^2 P}",
		"description": "Average distance between collisions. Inversely proportional to pressure P and molecular diameter squared.",
		"subject": "P",
		"chapterName": "Kinetic Theory",
		"tags": [
			"mean-free-path",
			"kinetic-theory",
			"collisions"
		],
		"important": false
	},
	{
		"id": "p-shm-1",
		"title": "Simple Harmonic Motion Kinematics",
		"latex": "x = A\\sin(\\omega t + \\phi), \\quad v = \\omega\\sqrt{A^2 - x^2}, \\quad a = -\\omega^2 x, \\quad E = \\frac{1}{2}m\\omega^2 A^2",
		"description": "Restoring acceleration directly proportional to negative displacement. Total mechanical energy is constant.",
		"subject": "P",
		"chapterName": "Oscillations",
		"tags": [
			"shm",
			"oscillation",
			"velocity",
			"energy",
			"amplitude"
		],
		"important": true
	},
	{
		"id": "p-shm-2",
		"title": "Periods of Simple & Compound Pendulums",
		"latex": "T_{spring} = 2\\pi\\sqrt{\\frac{m}{k}}, \\quad T_{simple} = 2\\pi\\sqrt{\\frac{L}{g}}, \\quad T_{phys} = 2\\pi\\sqrt{\\frac{I}{mgd}}",
		"description": "Time periods for spring-mass, simple pendulum, and physical rigid body pivoted at distance d from COM.",
		"subject": "P",
		"chapterName": "Oscillations",
		"tags": [
			"time-period",
			"pendulum",
			"spring-mass",
			"shm"
		],
		"important": true
	},
	{
		"id": "p-wav-1",
		"title": "Wave Velocity & String Waves",
		"latex": "y(x,t) = A\\sin(kx \\mp \\omega t), \\quad v = \\frac{\\omega}{k} = \\nu\\lambda = \\sqrt{\\frac{T}{\\mu}}",
		"description": "Wave velocity on stretched string depends on tension T and linear mass density mu.",
		"subject": "P",
		"chapterName": "Waves",
		"tags": [
			"wave-velocity",
			"frequency",
			"wavelength",
			"string"
		],
		"important": true
	},
	{
		"id": "p-wav-2",
		"title": "Organ Pipes, Standing Waves & Beats",
		"latex": "\\nu_n^{open} = \\frac{n v}{2L} \\;(n=1,2,3), \\quad \\nu_m^{closed} = \\frac{(2m - 1)v}{4L} \\;(m=1,2,3), \\quad \\nu_{beat} = |\\nu_1 - \\nu_2|",
		"description": "Open organ pipe produces all harmonics; closed pipe produces only odd harmonics.",
		"subject": "P",
		"chapterName": "Waves",
		"tags": [
			"organ-pipe",
			"harmonics",
			"standing-waves",
			"beats"
		],
		"important": true
	},
	{
		"id": "p-wav-3",
		"title": "Doppler Effect in Sound",
		"latex": "\\nu' = \\nu\\left(\\frac{v \\pm v_o}{v \\mp v_s}\\right)",
		"description": "Apparent frequency observed when observer or sound source are moving along the line of sight.",
		"subject": "P",
		"chapterName": "Waves",
		"tags": [
			"doppler",
			"sound",
			"frequency-shift"
		],
		"important": true
	},
	{
		"id": "p-es-1",
		"title": "Coulomb's Law & Electric Dipole Fields",
		"latex": "F = \\frac{1}{4\\pi\\varepsilon_0}\\frac{q_1 q_2}{r^2}, \\quad E_{axial} = \\frac{1}{4\\pi\\varepsilon_0}\\frac{2p}{r^3}, \\quad E_{equatorial} = \\frac{1}{4\\pi\\varepsilon_0}\\frac{p}{r^3}, \\quad \\vec{\\tau} = \\vec{p}\\times\\vec{E}",
		"description": "Dipole moment p = q * (2a). Torque on dipole tau = p x E, and potential energy U = -p . E.",
		"subject": "P",
		"chapterName": "Electric Charges and Fields",
		"tags": [
			"coulomb",
			"electric-field",
			"dipole",
			"torque"
		],
		"important": true
	},
	{
		"id": "p-es-2",
		"title": "Gauss's Law & Symmetrical Fields",
		"latex": "\\oint \\vec{E}\\cdot d\\vec{A} = \\frac{q_{enc}}{\\varepsilon_0}, \\quad E_{line} = \\frac{\\lambda}{2\\pi\\varepsilon_0 r}, \\quad E_{sheet} = \\frac{\\sigma}{2\\varepsilon_0}",
		"description": "Electric flux through closed surface equals enclosed charge divided by permittivity of free space.",
		"subject": "P",
		"chapterName": "Electric Charges and Fields",
		"tags": [
			"gauss-law",
			"flux",
			"infinite-line",
			"plane-sheet"
		],
		"important": true
	},
	{
		"id": "p-cap-1",
		"title": "Capacitance & Dielectric Insertion",
		"latex": "C_0 = \\frac{\\varepsilon_0 A}{d}, \\quad C = K C_0 = \\frac{\\varepsilon_0 A}{d - t + \\frac{t}{K}}, \\quad U = \\frac{1}{2}C V^2 = \\frac{Q^2}{2C}",
		"description": "Parallel plate capacitor with slab of thickness t and dielectric constant K. Energy density u = 0.5 * eps0 * E^2.",
		"subject": "P",
		"chapterName": "Electrostatic Potential and Capacitance",
		"tags": [
			"capacitance",
			"dielectric",
			"energy-stored",
			"parallel-plate"
		],
		"important": true
	},
	{
		"id": "p-cur-1",
		"title": "Drift Velocity & Ohm’s Law Microscopic Form",
		"latex": "v_d = \\frac{e E \\tau}{m}, \\quad I = n e A v_d, \\quad \\vec{J} = \\sigma \\vec{E} = \\frac{\\vec{E}}{\\rho}, \\quad R = \\rho\\frac{L}{A}",
		"description": "Relation between drift velocity, current, charge carrier density n, and relaxation time tau.",
		"subject": "P",
		"chapterName": "Current Electricity",
		"tags": [
			"current",
			"drift-velocity",
			"resistivity",
			"ohms-law"
		],
		"important": true
	},
	{
		"id": "p-cur-2",
		"title": "Kirchhoff’s Laws & Wheatstone Bridge",
		"latex": "\\sum I_{in} = \\sum I_{out}, \\quad \\sum \\Delta V = 0, \\quad \\frac{P}{Q} = \\frac{R}{S} \\implies I_G = 0",
		"description": "KCL (junction rule, charge conservation), KVL (loop rule, energy conservation), and balanced Wheatstone condition.",
		"subject": "P",
		"chapterName": "Current Electricity",
		"tags": [
			"kirchhoff",
			"wheatstone",
			"kcl",
			"kvl"
		],
		"important": true
	},
	{
		"id": "p-cur-3",
		"title": "RC Circuit Transient Charging & Discharging",
		"latex": "q(t) = Q_0\\left(1 - e^{-t/RC}\\right) \\;\\text{[Charge]}, \\quad q(t) = Q_0 e^{-t/RC} \\;\\text{[Discharge]}, \\quad \\tau = RC",
		"description": "Time constant tau = R*C represents time to reach ~63.2% charge or drop to ~36.8% remaining charge.",
		"subject": "P",
		"chapterName": "Current Electricity",
		"tags": [
			"rc-circuit",
			"transient",
			"time-constant",
			"charging"
		],
		"important": true
	},
	{
		"id": "p-mag-1",
		"title": "Lorentz Force & Helical Motion",
		"latex": "\\vec{F} = q(\\vec{E} + \\vec{v}\\times\\vec{B}), \\quad r = \\frac{m v_\\perp}{q B}, \\quad T = \\frac{2\\pi m}{q B}, \\quad \\text{Pitch} = v_\\parallel T",
		"description": "Charged particle trajectory in magnetic field. Radius depends only on perpendicular velocity component.",
		"subject": "P",
		"chapterName": "Moving Charges and Magnetism",
		"tags": [
			"lorentz-force",
			"magnetic-field",
			"cyclotron-radius",
			"pitch"
		],
		"important": true
	},
	{
		"id": "p-mag-2",
		"title": "Biot-Savart Law & Circular Coil Field",
		"latex": "d\\vec{B} = \\frac{\\mu_0}{4\\pi}\\frac{I\\,d\\vec{l}\\times\\hat{r}}{r^2}, \\quad B_{axis} = \\frac{\\mu_0 N I R^2}{2(R^2 + x^2)^{3/2}}, \\quad B_{center} = \\frac{\\mu_0 N I}{2R}",
		"description": "Magnetic field produced by current-carrying circular loop of radius R and N turns.",
		"subject": "P",
		"chapterName": "Moving Charges and Magnetism",
		"tags": [
			"biot-savart",
			"magnetic-field",
			"circular-loop"
		],
		"important": true
	},
	{
		"id": "p-mag-3",
		"title": "Ampere's Circuital Law & Solenoid",
		"latex": "\\oint \\vec{B}\\cdot d\\vec{l} = \\mu_0 I_{enc}, \\quad B_{solenoid} = \\mu_0 n I, \\quad B_{wire} = \\frac{\\mu_0 I}{2\\pi r}",
		"description": "Magnetic field inside long solenoid with n turns per unit length, and around long straight wire.",
		"subject": "P",
		"chapterName": "Moving Charges and Magnetism",
		"tags": [
			"ampere-law",
			"solenoid",
			"magnetic-field"
		],
		"important": true
	},
	{
		"id": "p-mat-1",
		"title": "Magnetic Dipole & Curie’s Law",
		"latex": "\\vec{M} = N I \\vec{A}, \\quad \\vec{\\tau} = \\vec{M}\\times\\vec{B}, \\quad U = -\\vec{M}\\cdot\\vec{B}, \\quad \\chi = \\frac{C}{T} \\;\\text{[Paramagnetic]}",
		"description": "Magnetic susceptibility chi = I / H, relative permeability mu_r = 1 + chi. Curie temperature for ferromagnets.",
		"subject": "P",
		"chapterName": "Magnetism and Matter",
		"tags": [
			"magnetic-dipole",
			"curie-law",
			"susceptibility",
			"permeability"
		],
		"important": true
	},
	{
		"id": "p-emi-1",
		"title": "Faraday’s Law, Motional EMF & Inductance",
		"latex": "\\mathcal{E} = -\\frac{d\\Phi_B}{dt}, \\quad \\mathcal{E}_{mot} = B v l, \\quad \\mathcal{E}_{rot} = \\frac{1}{2}B\\omega l^2, \\quad \\mathcal{E}_L = -L\\frac{dI}{dt}",
		"description": "Induced EMF opposes flux change (Lenz law). Self inductance of solenoid L = mu_0 * n^2 * A * l.",
		"subject": "P",
		"chapterName": "Electromagnetic Induction",
		"tags": [
			"faraday",
			"lenz",
			"motional-emf",
			"inductance"
		],
		"important": true
	},
	{
		"id": "p-emi-2",
		"title": "LR Circuit Growth & Magnetic Energy Density",
		"latex": "I(t) = I_0\\left(1 - e^{-t/\\tau_L}\\right), \\quad \\tau_L = \\frac{L}{R}, \\quad U_B = \\frac{1}{2}L I^2, \\quad u_B = \\frac{B^2}{2\\mu_0}",
		"description": "Inductive time constant tau = L / R. Energy stored in magnetic field per unit volume u_B.",
		"subject": "P",
		"chapterName": "Electromagnetic Induction",
		"tags": [
			"lr-circuit",
			"time-constant",
			"magnetic-energy"
		],
		"important": false
	},
	{
		"id": "p-ac-1",
		"title": "Series LCR Circuit & Resonance",
		"latex": "Z = \\sqrt{R^2 + (X_L - X_C)^2}, \\quad X_L = \\omega L, \\quad X_C = \\frac{1}{\\omega C}, \\quad \\omega_0 = \\frac{1}{\\sqrt{LC}}",
		"description": "Impedance triangle. At resonance, impedance is purely resistive (Z = R) and current is maximum.",
		"subject": "P",
		"chapterName": "Alternating Current",
		"tags": [
			"lcr",
			"impedance",
			"resonance",
			"reactance"
		],
		"important": true
	},
	{
		"id": "p-ac-2",
		"title": "Power Factor, Quality Factor & Transformer",
		"latex": "P_{avg} = V_{rms} I_{rms}\\cos\\phi, \\quad \\cos\\phi = \\frac{R}{Z}, \\quad Q = \\frac{\\omega_0 L}{R} = \\frac{1}{R}\\sqrt{\\frac{L}{C}}, \\quad \\frac{V_s}{V_p} = \\frac{N_s}{N_p} = \\frac{I_p}{I_s}",
		"description": "Power dissipated in AC circuit depends on power factor cos(phi). Quality factor Q measures sharpness of resonance.",
		"subject": "P",
		"chapterName": "Alternating Current",
		"tags": [
			"power-factor",
			"quality-factor",
			"transformer",
			"rms"
		],
		"important": true
	},
	{
		"id": "p-emw-1",
		"title": "Electromagnetic Wave Velocity & Poynting Vector",
		"latex": "c = \\frac{1}{\\sqrt{\\mu_0 \\varepsilon_0}} = \\frac{E_0}{B_0}, \\quad \\vec{S} = \\frac{1}{\\mu_0}(\\vec{E}\\times\\vec{B}), \\quad I = \\langle S \\rangle = \\frac{1}{2}c\\varepsilon_0 E_0^2",
		"description": "Speed of light c in vacuum, relationship between electric and magnetic amplitudes, and wave intensity I.",
		"subject": "P",
		"chapterName": "Electromagnetic Waves",
		"tags": [
			"em-waves",
			"speed-of-light",
			"poynting-vector",
			"intensity"
		],
		"important": true
	},
	{
		"id": "p-opt-1",
		"title": "Snell’s Law, Critical Angle & Refraction at Spherical Surface",
		"latex": "n_1\\sin\\theta_1 = n_2\\sin\\theta_2, \\quad \\sin\\theta_c = \\frac{n_2}{n_1}, \\quad \\frac{\\mu_2}{v} - \\frac{\\mu_1}{u} = \\frac{\\mu_2 - \\mu_1}{R}",
		"description": "Total internal reflection occurs when angle of incidence exceeds critical angle theta_c in denser medium.",
		"subject": "P",
		"chapterName": "Ray Optics",
		"tags": [
			"snell",
			"critical-angle",
			"tir",
			"refraction",
			"spherical-surface"
		],
		"important": true
	},
	{
		"id": "p-opt-2",
		"title": "Lens Maker Formula & Prism Deviation",
		"latex": "\\frac{1}{f} = (\\mu - 1)\\left(\\frac{1}{R_1} - \\frac{1}{R_2}\\right), \\quad \\mu = \\frac{\\sin\\left(\\frac{A + \\delta_m}{2}\\right)}{\\sin(A/2)}",
		"description": "Focal length of thin lens in medium, and refractive index from prism angle A and minimum deviation delta_m.",
		"subject": "P",
		"chapterName": "Ray Optics",
		"tags": [
			"lens-maker",
			"focal-length",
			"prism",
			"minimum-deviation"
		],
		"important": true
	},
	{
		"id": "p-opt-3",
		"title": "Optical Instruments Magnification",
		"latex": "m_{micro} = -\\frac{v_o}{u_o}\\left(1 + \\frac{D}{f_e}\\right), \\quad m_{tele} = -\\frac{f_o}{f_e}, \\quad L_{tele} = f_o + f_e",
		"description": "Magnifying powers for compound microscope and astronomical telescope at normal adjustment (image at infinity).",
		"subject": "P",
		"chapterName": "Ray Optics",
		"tags": [
			"microscope",
			"telescope",
			"magnification"
		],
		"important": false
	},
	{
		"id": "p-wopt-1",
		"title": "Young’s Double Slit Experiment (YDSE)",
		"latex": "\\beta = \\frac{\\lambda D}{d}, \\quad y_n^{bright} = \\frac{n\\lambda D}{d}, \\quad y_n^{dark} = \\left(n - \\frac{1}{2}\\right)\\frac{\\lambda D}{d}",
		"description": "Fringe width beta is independent of order n. Optical path difference Delta x = d * sin(theta) = d * y / D.",
		"subject": "P",
		"chapterName": "Wave Optics",
		"tags": [
			"ydse",
			"interference",
			"fringe-width",
			"path-difference"
		],
		"important": true
	},
	{
		"id": "p-wopt-2",
		"title": "Interference Intensity & Brewster’s Law",
		"latex": "I = 4 I_0\\cos^2\\left(\\frac{\\Delta\\phi}{2}\\right), \\quad \\Delta\\phi = \\frac{2\\pi}{\\lambda}\\Delta x, \\quad \\tan i_p = \\mu",
		"description": "Coherent addition of two waves of equal intensity I_0. At Brewster angle i_p, reflected light is 100% polarized.",
		"subject": "P",
		"chapterName": "Wave Optics",
		"tags": [
			"intensity",
			"polarization",
			"brewster",
			"phase-difference"
		],
		"important": true
	},
	{
		"id": "p-dual-1",
		"title": "Photoelectric Effect & Stopping Potential",
		"latex": "h\\nu = \\phi_0 + K_{max} = h\\nu_0 + e V_0, \\quad K_{max} = \\frac{1}{2}m v_{max}^2 = e V_0",
		"description": "Einstein photoelectric equation: photon energy equals work function phi_0 plus maximum kinetic energy.",
		"subject": "P",
		"chapterName": "Dual Nature of Radiation and Matter",
		"tags": [
			"photoelectric",
			"work-function",
			"stopping-potential",
			"einstein"
		],
		"important": true
	},
	{
		"id": "p-dual-2",
		"title": "de Broglie Wavelength Formulas",
		"latex": "\\lambda = \\frac{h}{p} = \\frac{h}{\\sqrt{2mE}} = \\frac{h}{\\sqrt{2mqV}}, \\quad \\lambda_{electron} = \\frac{12.27}{\\sqrt{V}}\\text{ \\AA}",
		"description": "Matter wave wavelength for particle of momentum p, kinetic energy E, or accelerated through voltage V.",
		"subject": "P",
		"chapterName": "Dual Nature of Radiation and Matter",
		"tags": [
			"de-broglie",
			"matter-waves",
			"electron-wavelength"
		],
		"important": true
	},
	{
		"id": "p-atom-1",
		"title": "Bohr Model Radii, Velocities & Energy Levels",
		"latex": "r_n = 0.529\\frac{n^2}{Z}\\text{ \\AA}, \\quad v_n = 2.18\\times 10^6\\frac{Z}{n}\\text{ m/s}, \\quad E_n = -13.6\\frac{Z^2}{n^2}\\text{ eV}",
		"description": "Quantized parameters for hydrogen and hydrogen-like ions (He+, Li2+) with atomic number Z.",
		"subject": "P",
		"chapterName": "Atoms",
		"tags": [
			"bohr",
			"energy-levels",
			"bohr-radius",
			"hydrogen-atom"
		],
		"important": true
	},
	{
		"id": "p-atom-2",
		"title": "Rydberg Formula & Spectral Series",
		"latex": "\\frac{1}{\\lambda} = R Z^2\\left(\\frac{1}{n_1^2} - \\frac{1}{n_2^2}\\right), \\quad R \\approx 1.097\\times 10^7\\text{ m}^{-1}",
		"description": "Lyman (n1=1, UV), Balmer (n1=2, Visible), Paschen (n1=3, IR), Brackett (n1=4, IR), Pfund (n1=5, IR).",
		"subject": "P",
		"chapterName": "Atoms",
		"tags": [
			"rydberg",
			"spectral-series",
			"lyman",
			"balmer"
		],
		"important": true
	},
	{
		"id": "p-nuc-1",
		"title": "Nuclear Radius & Mass Defect Binding Energy",
		"latex": "R = R_0 A^{1/3} \\;(R_0 \\approx 1.2\\text{ fm}), \\quad \\Delta E_b = \\Delta m\\times 931.5\\text{ MeV}",
		"description": "Mass defect Delta m = [Z*m_p + (A - Z)*m_n - M_nucleus]. Binding energy per nucleon measures stability.",
		"subject": "P",
		"chapterName": "Nuclei",
		"tags": [
			"nuclear-radius",
			"mass-defect",
			"binding-energy"
		],
		"important": true
	},
	{
		"id": "p-nuc-2",
		"title": "Law of Radioactive Decay",
		"latex": "N(t) = N_0 e^{-\\lambda t}, \\quad T_{1/2} = \\frac{\\ln 2}{\\lambda} \\approx \\frac{0.693}{\\lambda}, \\quad T_{mean} = \\frac{1}{\\lambda}",
		"description": "Activity A(t) = lambda * N(t) = A_0 * e^(-lambda * t). Half-life T_1/2 is 0.693 times mean life.",
		"subject": "P",
		"chapterName": "Nuclei",
		"tags": [
			"radioactivity",
			"half-life",
			"decay-constant",
			"activity"
		],
		"important": true
	},
	{
		"id": "p-semi-1",
		"title": "Carrier Densities & Diode Dynamic Resistance",
		"latex": "n_e n_h = n_i^2, \\quad \\sigma = e(n_e \\mu_e + n_h \\mu_h), \\quad r_d = \\frac{\\Delta V}{\\Delta I}",
		"description": "Mass action law in semiconductors. Total electrical conductivity accounts for electrons and holes.",
		"subject": "P",
		"chapterName": "Semiconductor Electronics",
		"tags": [
			"semiconductor",
			"mass-action",
			"conductivity",
			"dynamic-resistance"
		],
		"important": true
	},
	{
		"id": "c-mole-1",
		"title": "Mole Calculations & Stoichiometry",
		"latex": "n = \\frac{w}{M} = \\frac{N}{N_A} = \\frac{V_{STP}\\text{ (L)}}{22.4}",
		"description": "Number of moles from given mass, particle count, or gas volume at standard temperature and pressure.",
		"subject": "C",
		"chapterName": "Some Basic Concepts of Chemistry",
		"tags": [
			"mole-concept",
			"stoichiometry",
			"avogadro",
			"stp"
		],
		"important": true
	},
	{
		"id": "c-mole-2",
		"title": "Concentration Units: M, m, x & ppm",
		"latex": "M = \\frac{n_{solute}}{V_{sol}\\text{ (L)}}, \\quad m = \\frac{n_{solute}}{w_{solvent}\\text{ (kg)}}, \\quad x_A = \\frac{n_A}{n_A + n_B}, \\quad \\text{ppm} = \\frac{w_{solute}}{w_{total}}\\times 10^6",
		"description": "Molarity (temp dependent), Molality (temp independent), Mole fraction, and parts per million.",
		"subject": "C",
		"chapterName": "Some Basic Concepts of Chemistry",
		"tags": [
			"molarity",
			"molality",
			"mole-fraction",
			"concentration"
		],
		"important": true
	},
	{
		"id": "c-atom-1",
		"title": "Photoelectric & De Broglie Relations",
		"latex": "E = h\\nu = \\frac{hc}{\\lambda} \\approx \\frac{1240}{\\lambda\\text{ (nm)}}\\text{ eV}, \\quad \\lambda = \\frac{h}{p} = \\frac{h}{mv}",
		"description": "Energy of quantum photon and de Broglie wave-particle duality relation.",
		"subject": "C",
		"chapterName": "Structure of Atom",
		"tags": [
			"planck",
			"photon",
			"de-broglie",
			"quantum"
		],
		"important": true
	},
	{
		"id": "c-atom-2",
		"title": "Heisenberg Uncertainty & Orbital Angular Momentum",
		"latex": "\\Delta x \\cdot \\Delta p \\ge \\frac{h}{4\\pi}, \\quad L = \\sqrt{l(l+1)}\\frac{h}{2\\pi}, \\quad \\mu_s = \\sqrt{n(n+2)}\\text{ BM}",
		"description": "Uncertainty principle, orbital angular momentum for azimuthal quantum number l, and spin-only magnetic moment for n unpaired electrons.",
		"subject": "C",
		"chapterName": "Structure of Atom",
		"tags": [
			"heisenberg",
			"uncertainty",
			"quantum-numbers",
			"spin-moment"
		],
		"important": true
	},
	{
		"id": "c-per-1",
		"title": "Electronegativity (Pauling Scale) & Trends",
		"latex": "\\chi_A - \\chi_B = 0.208\\sqrt{\\Delta} \\;\\text{(in kcal/mol)} = 0.102\\sqrt{\\Delta} \\;\\text{(in kJ/mol)}",
		"description": "Delta is resonance extra bond energy. Electronegativity order: F > O > Cl approx N > Br > I.",
		"subject": "C",
		"chapterName": "Classification of Elements and Periodicity",
		"tags": [
			"electronegativity",
			"pauling",
			"periodicity",
			"trends"
		],
		"important": true
	},
	{
		"id": "c-bond-1",
		"title": "Dipole Moment & Formal Charge",
		"latex": "\\mu = q \\times d, \\quad \\text{FC} = V - N_{lone} - \\frac{1}{2}N_{shared}",
		"description": "Dipole moment in Debye (1 D = 3.33 x 10^-30 C m). Formal charge on atom in Lewis structure.",
		"subject": "C",
		"chapterName": "Chemical Bonding and Molecular Structure",
		"tags": [
			"dipole-moment",
			"formal-charge",
			"lewis-structure"
		],
		"important": true
	},
	{
		"id": "c-bond-2",
		"title": "Molecular Orbital Theory Bond Order",
		"latex": "\\text{Bond Order} = \\frac{N_b - N_a}{2}",
		"description": "Nb = bonding electrons, Na = antibonding electrons. Bond order > 0 implies stable species. Fractional bond order is common (e.g. O2+ is 2.5).",
		"subject": "C",
		"chapterName": "Chemical Bonding and Molecular Structure",
		"tags": [
			"mot",
			"bond-order",
			"bonding",
			"antibonding"
		],
		"important": true
	},
	{
		"id": "c-gas-1",
		"title": "Ideal Gas Equation & Dalton’s Law",
		"latex": "P V = n R T = \\frac{w}{M} R T, \\quad P_A = x_A P_{total}, \\quad \\frac{r_1}{r_2} = \\sqrt{\\frac{M_2}{M_1}}",
		"description": "Ideal gas law, partial pressure from mole fraction, and Graham rate of gas effusion/diffusion.",
		"subject": "C",
		"chapterName": "States of Matter",
		"tags": [
			"ideal-gas",
			"dalton",
			"graham",
			"effusion",
			"partial-pressure"
		],
		"important": true
	},
	{
		"id": "c-gas-2",
		"title": "Van der Waals Equation & Critical Constants",
		"latex": "\\left(P + \\frac{a n^2}{V^2}\\right)(V - n b) = n R T, \\quad T_c = \\frac{8a}{27Rb}, \\quad P_c = \\frac{a}{27b^2}, \\quad Z_c = \\frac{3}{8}",
		"description": "Correction for intermolecular attraction (a) and molecular volume (b). Compressibility factor Z_c = 0.375 at critical point.",
		"subject": "C",
		"chapterName": "States of Matter",
		"tags": [
			"van-der-waals",
			"real-gas",
			"critical-constants",
			"compressibility"
		],
		"important": true
	},
	{
		"id": "c-td-1",
		"title": "First Law of Thermodynamics & Enthalpy Relation",
		"latex": "\\Delta U = q + w, \\quad \\Delta H = \\Delta U + \\Delta n_g R T, \\quad w_{rev} = -2.303 n R T \\log_{10}\\left(\\frac{V_2}{V_1}\\right)",
		"description": "Delta n_g is change in moles of gaseous species. Reversible isothermal expansion gives maximum work.",
		"subject": "C",
		"chapterName": "Thermodynamics",
		"tags": [
			"enthalpy",
			"internal-energy",
			"first-law",
			"work"
		],
		"important": true
	},
	{
		"id": "c-td-2",
		"title": "Entropy & Gibbs Free Energy Spontaneity",
		"latex": "\\Delta S = \\frac{q_{rev}}{T}, \\quad \\Delta G = \\Delta H - T\\Delta S, \\quad \\Delta G^\\circ = -RT\\ln K_{eq} = -2.303 RT\\log K_{eq}",
		"description": "Process is spontaneous when Delta G < 0. At equilibrium Delta G = 0 and standard free energy determines equilibrium constant.",
		"subject": "C",
		"chapterName": "Thermodynamics",
		"tags": [
			"entropy",
			"gibbs-free-energy",
			"spontaneity",
			"equilibrium-constant"
		],
		"important": true
	},
	{
		"id": "c-eq-1",
		"title": "Equilibrium Constants Kp vs Kc & Van ’t Hoff Isochore",
		"latex": "K_p = K_c(RT)^{\\Delta n_g}, \\quad \\ln\\left(\\frac{K_2}{K_1}\\right) = \\frac{\\Delta H^\\circ}{R}\\left(\\frac{1}{T_1} - \\frac{1}{T_2}\\right)",
		"description": "Temperature dependence of equilibrium constant K depends on whether the reaction is endothermic (Delta H > 0) or exothermic.",
		"subject": "C",
		"chapterName": "Equilibrium",
		"tags": [
			"kp-kc",
			"chemical-equilibrium",
			"van-t-hoff",
			"temperature"
		],
		"important": true
	},
	{
		"id": "c-eq-2",
		"title": "Ostwald Dilution Law & pH of Weak Acids",
		"latex": "\\alpha = \\sqrt{\\frac{K_a}{C}}, \\quad [H^+] = C\\alpha = \\sqrt{K_a C}, \\quad pH = \\frac{1}{2}(pK_a - \\log C)",
		"description": "Degree of dissociation alpha for weak electrolyte at concentration C. Valid when alpha << 1.",
		"subject": "C",
		"chapterName": "Equilibrium",
		"tags": [
			"ostwald",
			"ph",
			"weak-acid",
			"dissociation"
		],
		"important": true
	},
	{
		"id": "c-eq-3",
		"title": "Henderson-Hasselbalch Equation for Buffer Solutions",
		"latex": "pH = pK_a + \\log_{10}\\left(\\frac{[\\text{Conjugate Base}]}{[\\text{Acid}]}\\right), \\quad pOH = pK_b + \\log_{10}\\left(\\frac{[\\text{Conjugate Acid}]}{[\\text{Base}]}\\right)",
		"description": "Buffer capacity is maximum when [Salt] = [Acid], giving pH = pKa.",
		"subject": "C",
		"chapterName": "Equilibrium",
		"tags": [
			"buffer",
			"henderson-hasselbalch",
			"ph-buffer",
			"ionic-equilibrium"
		],
		"important": true
	},
	{
		"id": "c-eq-4",
		"title": "Solubility Product & Precipitation Condition",
		"latex": "A_x B_y \\rightleftharpoons x A^{y+} + y B^{x-}, \\quad K_{sp} = x^x y^y S^{x+y}, \\quad Q_{sp} > K_{sp} \\implies \\text{Precipitate}",
		"description": "Relates molar solubility S to solubility product Ksp. For 1:1 salt Ksp = S^2, for 1:2 salt Ksp = 4S^3.",
		"subject": "C",
		"chapterName": "Equilibrium",
		"tags": [
			"solubility-product",
			"ksp",
			"precipitation"
		],
		"important": true
	},
	{
		"id": "c-red-1",
		"title": "Equivalent Weight & N-Factor in Redox Reactions",
		"latex": "E = \\frac{M}{n\\text{-factor}}, \\quad \\text{Normality} = \\text{Molarity}\\times n\\text{-factor}, \\quad E^\\circ_{cell} = E^\\circ_{cathode} - E^\\circ_{anode}",
		"description": "For KMnO4 in acidic medium n-factor = 5 (Mn+7 to Mn+2), neutral n=3 (to MnO2), basic n=1 (to MnO4 2-).",
		"subject": "C",
		"chapterName": "Redox Reactions",
		"tags": [
			"redox",
			"n-factor",
			"equivalent-weight",
			"normality"
		],
		"important": true
	},
	{
		"id": "c-hyd-1",
		"title": "Strength of Hydrogen Peroxide & Hardness of Water",
		"latex": "\\text{Volume Strength} = 11.2\\times M = 5.6\\times N, \\quad \\text{Hardness (ppm)} = \\frac{w_{\\text{impurity}}}{M_{\\text{impurity}}}\\times 100\\times\\frac{10^6}{w_{\\text{water}}}",
		"description": "Volume strength is volume of O2 gas in liters liberated by 1 liter of H2O2 at STP. Water hardness expressed in ppm of CaCO3.",
		"subject": "C",
		"chapterName": "Hydrogen",
		"tags": [
			"hydrogen-peroxide",
			"volume-strength",
			"water-hardness"
		],
		"important": false
	},
	{
		"id": "c-pblk-1",
		"title": "Silicates Classification Formula",
		"latex": "[\\text{SiO}_4]^{4-} \\;\\text{[Ortho]}, \\quad [\\text{Si}_2\\text{O}_7]^{6-} \\;\\text{[Pyro]}, \\quad [(\\text{SiO}_3)_n]^{2n-} \\;\\text{[Cyclic/Chain]}, \\quad [(\\text{Si}_2\\text{O}_5)_n]^{2n-} \\;\\text{[Sheet]}",
		"description": "Classification based on number of shared oxygen atoms per SiO4 tetrahedron (0, 1, 2, 3, or 4 for 3D network).",
		"subject": "C",
		"chapterName": "The p-Block Elements",
		"tags": [
			"silicates",
			"p-block",
			"orthosilicates",
			"structures"
		],
		"important": false
	},
	{
		"id": "c-goc-1",
		"title": "Stability Order of Reaction Intermediates",
		"latex": "\\text{Carbocation}: 3^\\circ > 2^\\circ > 1^\\circ > \\text{CH}_3^+, \\quad \\text{Carbanion}: \\text{CH}_3^- > 1^\\circ > 2^\\circ > 3^\\circ",
		"description": "Carbocation stability driven by hyperconjugation (alpha-hydrogens) and +I. Carbanion destabilized by electron donating groups.",
		"subject": "C",
		"chapterName": "Organic Chemistry: Basic Principles",
		"tags": [
			"carbocation",
			"carbanion",
			"stability",
			"hyperconjugation",
			"goc"
		],
		"important": true
	},
	{
		"id": "c-hydc-1",
		"title": "Hückel’s Rule of Aromaticity",
		"latex": "\\pi\\text{ electrons} = (4n + 2) \\;\\text{[Aromatic]}, \\quad \\pi\\text{ electrons} = 4n \\;\\text{[Anti-aromatic]}",
		"description": "Requirements: planar, cyclic, continuous conjugation throughout ring with n = 0, 1, 2, 3... (e.g. 2, 6, 10, 14 pi electrons).",
		"subject": "C",
		"chapterName": "Hydrocarbons",
		"tags": [
			"aromaticity",
			"huckel",
			"anti-aromatic",
			"pi-electrons"
		],
		"important": true
	},
	{
		"id": "c-sol-1",
		"title": "Raoult’s Law & Relative Lowering of Vapor Pressure",
		"latex": "\\frac{P^\\circ - P_s}{P^\\circ} = i\\cdot x_{solute} = i\\frac{n}{n + N} \\approx i\\frac{w M_s}{m W}",
		"description": "Vapor pressure lowering of solvent caused by non-volatile solute with van t Hoff factor i.",
		"subject": "C",
		"chapterName": "Solutions",
		"tags": [
			"raoult",
			"vapor-pressure",
			"colligative",
			"rlvp"
		],
		"important": true
	},
	{
		"id": "c-sol-2",
		"title": "Elevation in Boiling Point & Depression in Freezing Point",
		"latex": "\\Delta T_b = i K_b m, \\quad \\Delta T_f = i K_f m, \\quad \\Pi = i C R T",
		"description": "Kb is ebullioscopic constant, Kf is cryoscopic constant, m is molality, and Pi is osmotic pressure.",
		"subject": "C",
		"chapterName": "Solutions",
		"tags": [
			"colligative",
			"boiling-point",
			"freezing-point",
			"osmotic-pressure"
		],
		"important": true
	},
	{
		"id": "c-sol-3",
		"title": "Van ’t Hoff Factor for Dissociation & Association",
		"latex": "i = 1 + (n - 1)\\alpha \\;\\text{[Dissociation]}, \\quad i = 1 + \\left(\\frac{1}{n} - 1\\right)\\alpha \\;\\text{[Association]}",
		"description": "Degree of dissociation/association alpha from measured colligative property. n is number of ions/particles per molecule.",
		"subject": "C",
		"chapterName": "Solutions",
		"tags": [
			"van-t-hoff",
			"dissociation",
			"association",
			"colligative"
		],
		"important": true
	},
	{
		"id": "c-elc-1",
		"title": "Nernst Equation for Electrode & Cell Potentials",
		"latex": "E_{cell} = E^\\circ_{cell} - \\frac{2.303 RT}{n F}\\log_{10} Q = E^\\circ_{cell} - \\frac{0.0591}{n}\\log_{10} Q \\;\\text{(at 298 K)}",
		"description": "Calculates non-standard EMF from standard potential and reaction quotient Q for n electrons transferred.",
		"subject": "C",
		"chapterName": "Electrochemistry",
		"tags": [
			"nernst",
			"electrochemistry",
			"emf",
			"cell-potential"
		],
		"important": true
	},
	{
		"id": "c-elc-2",
		"title": "Gibbs Free Energy & Cell Equilibrium",
		"latex": "\\Delta G^\\circ = -n F E^\\circ_{cell} = -RT\\ln K_{eq}, \\quad \\log_{10} K_{eq} = \\frac{n E^\\circ_{cell}}{0.0591}",
		"description": "Spontaneous electrochemical cell has positive E_cell and negative Delta G. F = 96485 C/mol.",
		"subject": "C",
		"chapterName": "Electrochemistry",
		"tags": [
			"gibbs-free-energy",
			"equilibrium-constant",
			"faraday"
		],
		"important": true
	},
	{
		"id": "c-elc-3",
		"title": "Kohlrausch’s Law & Faraday’s Electrolysis Law",
		"latex": "\\Lambda_m^\\circ = \\nu_+ \\lambda_+^\\circ + \\nu_- \\lambda_-^\\circ, \\quad \\alpha = \\frac{\\Lambda_m}{\\Lambda_m^\\circ}, \\quad w = Z I t = \\frac{E}{96500}I t",
		"description": "Molar conductivity at infinite dilution and mass of substance deposited by current I in time t seconds.",
		"subject": "C",
		"chapterName": "Electrochemistry",
		"tags": [
			"kohlrausch",
			"molar-conductivity",
			"faraday-law",
			"electrolysis"
		],
		"important": true
	},
	{
		"id": "c-kin-1",
		"title": "Integrated Rate Laws: Zero & First Order",
		"latex": "[A]_t = [A]_0 - k t \\;\\left(t_{1/2} = \\frac{[A]_0}{2k}\\right), \\quad k = \\frac{2.303}{t}\\log_{10}\\left(\\frac{[A]_0}{[A]_t}\\right) \\;\\left(t_{1/2} = \\frac{0.693}{k}\\right)",
		"description": "First order half-life is completely independent of initial reactant concentration.",
		"subject": "C",
		"chapterName": "Chemical Kinetics",
		"tags": [
			"kinetics",
			"rate-law",
			"half-life",
			"first-order",
			"zero-order"
		],
		"important": true
	},
	{
		"id": "c-kin-2",
		"title": "Arrhenius Equation for Temperature Dependence",
		"latex": "k = A e^{-E_a / RT}, \\quad \\log_{10}\\left(\\frac{k_2}{k_1}\\right) = \\frac{E_a}{2.303 R}\\left(\\frac{T_2 - T_1}{T_1 T_2}\\right)",
		"description": "Activation energy Ea determined from slope (-Ea / 2.303R) of log10(k) vs 1/T plot.",
		"subject": "C",
		"chapterName": "Chemical Kinetics",
		"tags": [
			"arrhenius",
			"activation-energy",
			"temperature-dependence"
		],
		"important": true
	},
	{
		"id": "c-coord-1",
		"title": "Crystal Field Splitting & CFSE",
		"latex": "\\Delta_t = \\frac{4}{9}\\Delta_o, \\quad \\text{CFSE}_{oct} = \\left(-0.4 n_{t_{2g}} + 0.6 n_{e_g}\\right)\\Delta_o + m P",
		"description": "Octahedral vs tetrahedral d-orbital splitting. P is pairing energy. Strong field ligands cause high CFSE (low spin).",
		"subject": "C",
		"chapterName": "Coordination Compounds",
		"tags": [
			"cfse",
			"crystal-field",
			"octahedral",
			"tetrahedral",
			"coordination"
		],
		"important": true
	},
	{
		"id": "c-coord-2",
		"title": "Effective Atomic Number (EAN Rule)",
		"latex": "\\text{EAN} = Z - (\\text{Oxidation State}) + 2\\times(\\text{Coordination Number})",
		"description": "Sidgwick EAN rule: complex is extraordinarily stable if EAN equals next noble gas atomic number.",
		"subject": "C",
		"chapterName": "Coordination Compounds",
		"tags": [
			"ean",
			"coordination-number",
			"oxidation-state",
			"stability"
		],
		"important": false
	},
	{
		"id": "c-halo-1",
		"title": "SN1 vs SN2 Nucleophilic Substitution Kinetics",
		"latex": "r_{SN1} = k[R-X] \\;\\text{(Carbocation, Racemization)}, \\quad r_{SN2} = k[R-X][Nu^-] \\;\\text{(Transition State, Inversion)}",
		"description": "SN1 reactivity: 3 deg > 2 deg > 1 deg (polar protic solvent). SN2 reactivity: CH3X > 1 deg > 2 deg > 3 deg (polar aprotic).",
		"subject": "C",
		"chapterName": "Haloalkanes and Haloarenes",
		"tags": [
			"sn1",
			"sn2",
			"kinetics",
			"stereochemistry",
			"walden-inversion"
		],
		"important": true
	},
	{
		"id": "c-alc-1",
		"title": "Lucas Reagent Turbidity Test",
		"latex": "R-\\text{OH} + \\text{HCl} \\xrightarrow{\\text{anhydrous ZnCl}_2} R-\\text{Cl} \\downarrow + \\text{H}_2\\text{O}",
		"description": "Tertiary alcohols give immediate turbidity; secondary alcohols take 5 minutes; primary alcohols give no turbidity at room temperature.",
		"subject": "C",
		"chapterName": "Alcohols, Phenols and Ethers",
		"tags": [
			"lucas-test",
			"turbidity",
			"alcohol-test"
		],
		"important": true
	},
	{
		"id": "c-ald-1",
		"title": "Aldol Condensation & Cannizzaro Criteria",
		"latex": "2\\text{CH}_3\\text{CHO} \\xrightarrow{\\text{dil. NaOH}} \\text{CH}_3-\\text{CH(OH)}-\\text{CH}_2\\text{CHO} \\xrightarrow{\\Delta} \\text{CH}_3-\\text{CH}=\\text{CH}-\\text{CHO}",
		"description": "Aldol requires at least one alpha-hydrogen. Carbonyls lacking alpha-hydrogen undergo Cannizzaro disproportionation.",
		"subject": "C",
		"chapterName": "Aldehydes, Ketones and Carboxylic Acids",
		"tags": [
			"aldol",
			"cannizzaro",
			"alpha-hydrogen",
			"condensation"
		],
		"important": true
	},
	{
		"id": "c-amn-1",
		"title": "Basicity Order of Amines in Aqueous Phase",
		"latex": "(\\text{CH}_3)_2\\text{NH} > \\text{CH}_3\\text{NH}_2 > (\\text{CH}_3)_3\\text{N} > \\text{NH}_3 \\quad (2^\\circ > 1^\\circ > 3^\\circ > \\text{NH}_3)",
		"description": "For methyl amines 2 deg > 1 deg > 3 deg due to combined inductive, steric, and hydration effects. For ethyl: 2 deg > 3 deg > 1 deg.",
		"subject": "C",
		"chapterName": "Amines",
		"tags": [
			"amines",
			"basicity",
			"inductive-effect",
			"hydration"
		],
		"important": true
	},
	{
		"id": "c-bio-1",
		"title": "Isoelectric Point of Amino Acids",
		"latex": "pI = \\frac{pK_{a1} + pK_{a2}}{2}",
		"description": "pH at which amino acid exists predominantly as electrically neutral dipolar Zwitterion with zero net mobility in electrophoresis.",
		"subject": "C",
		"chapterName": "Biomolecules",
		"tags": [
			"isoelectric-point",
			"amino-acids",
			"zwitterion"
		],
		"important": true
	},
	{
		"id": "m-set-1",
		"title": "Number of Relations & Functions",
		"latex": "n(A\\times B) = mn, \\quad \\text{Total Relations} = 2^{mn}, \\quad \\text{One-One Functions} = {}^m P_n \\; (m \\ge n)",
		"description": "From set A (size n) to set B (size m). Number of onto functions involves Stirling numbers / Inclusion-Exclusion.",
		"subject": "M",
		"chapterName": "Relations and Functions",
		"tags": [
			"relations",
			"functions",
			"one-one",
			"onto",
			"counting"
		],
		"important": true
	},
	{
		"id": "m-trig-1",
		"title": "Compound Angle & Double Angle Identities",
		"latex": "\\sin(A \\pm B) = \\sin A\\cos B \\pm \\cos A\\sin B, \\quad \\tan(A \\pm B) = \\frac{\\tan A \\pm \\tan B}{1 \\mp \\tan A\\tan B}, \\quad \\cos 2\\theta = 1 - 2\\sin^2\\theta",
		"description": "Core identities for trigonometry transformations and double/half angle simplifications.",
		"subject": "M",
		"chapterName": "Trigonometric Functions",
		"tags": [
			"trigonometry",
			"compound-angles",
			"double-angle"
		],
		"important": true
	},
	{
		"id": "m-trig-2",
		"title": "Product-to-Sum & Sum-to-Product Formulas",
		"latex": "2\\sin A\\cos B = \\sin(A+B) + \\sin(A-B), \\quad \\sin C + \\sin D = 2\\sin\\left(\\frac{C+D}{2}\\right)\\cos\\left(\\frac{C-D}{2}\\right)",
		"description": "Essential transformation rules for simplifying trigonometric polynomials and integrals.",
		"subject": "M",
		"chapterName": "Trigonometric Functions",
		"tags": [
			"transformations",
			"trig-identities",
			"sum-to-product"
		],
		"important": true
	},
	{
		"id": "m-trig-3",
		"title": "General Solutions of Trigonometric Equations",
		"latex": "\\sin\\theta = \\sin\\alpha \\implies \\theta = n\\pi + (-1)^n\\alpha, \\quad \\cos\\theta = \\cos\\alpha \\implies \\theta = 2n\\pi \\pm \\alpha, \\quad \\tan\\theta = \\tan\\alpha \\implies \\theta = n\\pi + \\alpha",
		"description": "General solutions for all integer values of n where alpha is the principal angle.",
		"subject": "M",
		"chapterName": "Trigonometric Functions",
		"tags": [
			"general-solution",
			"trig-equations"
		],
		"important": true
	},
	{
		"id": "m-quad-1",
		"title": "Quadratic Roots & Conditions for Common Roots",
		"latex": "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}, \\quad \\alpha + \\beta = -\\frac{b}{a}, \\quad \\alpha\\beta = \\frac{c}{a}, \\quad (ca' - c'a)^2 = (ab' - a'b)(bc' - b'c)",
		"description": "Formula for roots, Vieta formulas, and algebraic condition for two quadratics to share one common root.",
		"subject": "M",
		"chapterName": "Complex Numbers and Quadratic Equations",
		"tags": [
			"quadratic",
			"vieta",
			"roots",
			"common-roots"
		],
		"important": true
	},
	{
		"id": "m-cx-1",
		"title": "Euler Form, De Moivre & Cube Roots of Unity",
		"latex": "z = r e^{i\\theta} = r(\\cos\\theta + i\\sin\\theta), \\quad 1 + \\omega + \\omega^2 = 0, \\quad \\omega^3 = 1, \\quad \\omega = \\frac{-1 + i\\sqrt{3}}{2}",
		"description": "De Moivre theorem: (cos theta + i sin theta)^n = cos(n theta) + i sin(n theta). Triangle inequality: |z1 + z2| <= |z1| + |z2|.",
		"subject": "M",
		"chapterName": "Complex Numbers and Quadratic Equations",
		"tags": [
			"complex-numbers",
			"euler",
			"cube-roots",
			"omega",
			"de-moivre"
		],
		"important": true
	},
	{
		"id": "m-ineq-1",
		"title": "AM-GM-HM Inequality & Cauchy-Schwarz",
		"latex": "\\frac{a_1 + a_2 + \\dots + a_n}{n} \\ge (a_1 a_2 \\dots a_n)^{1/n} \\ge \\frac{n}{\\sum 1/a_i}, \\quad (\\sum a_i^2)(\\sum b_i^2) \\ge (\\sum a_i b_i)^2",
		"description": "Equality holds if and only if all terms are equal. Critical for finding extrema without derivatives.",
		"subject": "M",
		"chapterName": "Linear Inequalities",
		"tags": [
			"am-gm",
			"cauchy-schwarz",
			"inequalities",
			"extrema"
		],
		"important": true
	},
	{
		"id": "m-pnc-1",
		"title": "Permutations, Combinations & Derangements",
		"latex": "{}^n P_r = \\frac{n!}{(n-r)!}, \\quad {}^n C_r = \\frac{n!}{r!(n-r)!}, \\quad D_n = n!\\left(1 - \\frac{1}{1!} + \\frac{1}{2!} - \\dots + \\frac{(-1)^n}{n!}\\right)",
		"description": "Pascal identity: nCr + nC(r-1) = (n+1)Cr. Dn is number of derangements of n objects.",
		"subject": "M",
		"chapterName": "Permutations and Combinations",
		"tags": [
			"pnc",
			"combinations",
			"permutations",
			"derangements"
		],
		"important": true
	},
	{
		"id": "m-bin-1",
		"title": "Binomial Theorem General Term & Sums",
		"latex": "(x + y)^n = \\sum_{r=0}^n {}^n C_r x^{n-r} y^r, \\quad T_{r+1} = {}^n C_r x^{n-r} y^r, \\quad \\sum_{r=0}^n {}^n C_r = 2^n, \\quad \\sum_{r=1}^n r\\,{}^n C_r = n 2^{n-1}",
		"description": "Middle term occurs at r = n/2 (if n is even). Binomial coefficients properties.",
		"subject": "M",
		"chapterName": "Binomial Theorem",
		"tags": [
			"binomial",
			"expansion",
			"general-term",
			"coefficients"
		],
		"important": true
	},
	{
		"id": "m-seq-1",
		"title": "Arithmetic, Geometric & Power Sums",
		"latex": "S_n^{AP} = \\frac{n}{2}[2a + (n-1)d], \\quad S_\\infty^{GP} = \\frac{a}{1 - r} \\;(|r|<1), \\quad \\sum_{k=1}^n k^2 = \\frac{n(n+1)(2n+1)}{6}",
		"description": "Sum of n terms of AP, infinite sum of converging GP, and sum of first n squares and cubes [n(n+1)/2]^2.",
		"subject": "M",
		"chapterName": "Sequences and Series",
		"tags": [
			"ap",
			"gp",
			"series",
			"sum-of-squares"
		],
		"important": true
	},
	{
		"id": "m-line-1",
		"title": "Distance of Point to Line & Angle Between Lines",
		"latex": "d = \\frac{|a x_1 + b y_1 + c|}{\\sqrt{a^2 + b^2}}, \\quad d_{parallel} = \\frac{|c_1 - c_2|}{\\sqrt{a^2 + b^2}}, \\quad \\tan\\theta = \\left|\\frac{m_1 - m_2}{1 + m_1 m_2}\\right|",
		"description": "Perpendicular distance formulas, and angle theta between two lines with slopes m1 and m2.",
		"subject": "M",
		"chapterName": "Straight Lines",
		"tags": [
			"straight-lines",
			"perpendicular-distance",
			"parallel-lines",
			"angle"
		],
		"important": true
	},
	{
		"id": "m-circ-1",
		"title": "Circle Tangents, Intercepts & Director Circle",
		"latex": "x^2 + y^2 + 2gx + 2fy + c = 0, \\quad r = \\sqrt{g^2 + f^2 - c}, \\quad y = mx \\pm r\\sqrt{1 + m^2}, \\quad x^2 + y^2 = 2r^2",
		"description": "Condition of tangency c^2 = r^2(1 + m^2). Director circle is locus of perpendicular tangents.",
		"subject": "M",
		"chapterName": "Circles",
		"tags": [
			"circle",
			"tangent",
			"director-circle",
			"radius"
		],
		"important": true
	},
	{
		"id": "m-con-1",
		"title": "Parabola Standard Equations & Tangents",
		"latex": "y^2 = 4ax, \\quad \\text{Focus } (a, 0), \\quad y = mx + \\frac{a}{m} \\;\\text{[Slope Tangent]}, \\quad t y = x + a t^2 \\;\\text{[Parametric]}",
		"description": "Point of contact in slope form is (a / m^2, 2a / m). Latus rectum length is 4a.",
		"subject": "M",
		"chapterName": "Conic Sections",
		"tags": [
			"parabola",
			"conic",
			"tangent",
			"latus-rectum"
		],
		"important": true
	},
	{
		"id": "m-con-2",
		"title": "Ellipse Eccentricity, Foci & Tangent",
		"latex": "\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1, \\quad b^2 = a^2(1 - e^2), \\quad \\text{Foci } (\\pm a e, 0), \\quad y = mx \\pm \\sqrt{a^2 m^2 + b^2}",
		"description": "Eccentricity 0 < e < 1. Director circle equation x^2 + y^2 = a^2 + b^2.",
		"subject": "M",
		"chapterName": "Conic Sections",
		"tags": [
			"ellipse",
			"eccentricity",
			"foci",
			"tangent"
		],
		"important": true
	},
	{
		"id": "m-con-3",
		"title": "Hyperbola Equations, Asymptotes & Tangent",
		"latex": "\\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1, \\quad b^2 = a^2(e^2 - 1), \\quad y = mx \\pm \\sqrt{a^2 m^2 - b^2}, \\quad y = \\pm\\frac{b}{a}x",
		"description": "Eccentricity e > 1. Rectangular hyperbola when a = b (e = sqrt(2)), with equation x*y = c^2.",
		"subject": "M",
		"chapterName": "Conic Sections",
		"tags": [
			"hyperbola",
			"asymptotes",
			"eccentricity",
			"tangent"
		],
		"important": true
	},
	{
		"id": "m-lim-1",
		"title": "Standard Trigonometric, Exponential & Log Limits",
		"latex": "\\lim_{x\\to 0}\\frac{\\sin x}{x} = 1, \\quad \\lim_{x\\to 0}\\frac{e^x - 1}{x} = 1, \\quad \\lim_{x\\to 0}\\frac{\\ln(1+x)}{x} = 1, \\quad \\lim_{x\\to 0}(1+x)^{1/x} = e",
		"description": "Foundational limits. L'Hopital rule applies for indeterminate forms 0/0 and inf/inf: lim f/g = lim f'/g'.",
		"subject": "M",
		"chapterName": "Limits and Derivatives",
		"tags": [
			"limits",
			"standard-limits",
			"l-hopital",
			"calculus"
		],
		"important": true
	},
	{
		"id": "m-diff-1",
		"title": "Derivative Rules & Chain Rule",
		"latex": "(u v)' = u'v + u v', \\quad \\left(\\frac{u}{v}\\right)' = \\frac{u'v - u v'}{v^2}, \\quad \\frac{d}{dx}f(g(x)) = f'(g(x))g'(x)",
		"description": "Product, quotient, and chain rules for differentiating composites of differentiable functions.",
		"subject": "M",
		"chapterName": "Limits and Derivatives",
		"tags": [
			"derivatives",
			"product-rule",
			"quotient-rule",
			"chain-rule"
		],
		"important": true
	},
	{
		"id": "m-cont-1",
		"title": "Continuity & Differentiability Conditions",
		"latex": "\\lim_{x\\to c^-}f(x) = \\lim_{x\\to c^+}f(x) = f(c), \\quad L f'(c) = R f'(c) = \\lim_{h\\to 0}\\frac{f(c+h) - f(c)}{h}",
		"description": "Differentiability implies continuity, but continuity does not imply differentiability (e.g. f(x) = |x| at x = 0).",
		"subject": "M",
		"chapterName": "Continuity and Differentiability",
		"tags": [
			"continuity",
			"differentiability",
			"limits"
		],
		"important": true
	},
	{
		"id": "m-aod-1",
		"title": "Tangent & Normal Lines to Curves",
		"latex": "m = f'(x_0), \\quad y - y_0 = f'(x_0)(x - x_0) \\;\\text{[Tangent]}, \\quad y - y_0 = -\\frac{1}{f'(x_0)}(x - x_0) \\;\\text{[Normal]}",
		"description": "Equations of tangent and perpendicular normal to curve y = f(x) at point (x0, y0).",
		"subject": "M",
		"chapterName": "Application of Derivatives",
		"tags": [
			"aod",
			"tangent",
			"normal",
			"derivatives"
		],
		"important": true
	},
	{
		"id": "m-aod-2",
		"title": "Mean Value Theorems: Rolle’s & Lagrange’s",
		"latex": "f(a)=f(b) \\implies f'(c) = 0 \\;\\text{[Rolle]}, \\quad f'(c) = \\frac{f(b) - f(a)}{b - a} \\;\\text{[Lagrange LMVT]}",
		"description": "Guarantees existence of at least one c in (a, b) where instantaneous rate equals average rate.",
		"subject": "M",
		"chapterName": "Application of Derivatives",
		"tags": [
			"rolle",
			"lmvt",
			"mean-value-theorem"
		],
		"important": true
	},
	{
		"id": "m-int-1",
		"title": "Standard Indefinite Integrals",
		"latex": "\\int \\frac{dx}{x^2 + a^2} = \\frac{1}{a}\\arctan\\left(\\frac{x}{a}\\right), \\quad \\int \\frac{dx}{\\sqrt{a^2 - x^2}} = \\arcsin\\left(\\frac{x}{a}\\right), \\quad \\int \\frac{dx}{x^2 - a^2} = \\frac{1}{2a}\\ln\\left|\\frac{x-a}{x+a}\\right|",
		"description": "Three most frequently tested standard rational and irrational algebraic antiderivative forms.",
		"subject": "M",
		"chapterName": "Integrals",
		"tags": [
			"integration",
			"standard-integrals",
			"calculus"
		],
		"important": true
	},
	{
		"id": "m-int-2",
		"title": "Integration by Parts (ILATE) & Special Exponential",
		"latex": "\\int u v\\,dx = u\\int v\\,dx - \\int\\left(u'\\int v\\,dx\\right)dx, \\quad \\int e^x [f(x) + f'(x)]\\,dx = e^x f(x) + C",
		"description": "ILATE priority: Inverse > Logarithmic > Algebraic > Trigonometric > Exponential.",
		"subject": "M",
		"chapterName": "Integrals",
		"tags": [
			"by-parts",
			"ilate",
			"exponential-integral"
		],
		"important": true
	},
	{
		"id": "m-int-3",
		"title": "King’s Property & Leibniz Differentiation Rule",
		"latex": "\\int_a^b f(x) dx = \\int_a^b f(a + b - x) dx, \\quad \\frac{d}{dx}\\int_{u(x)}^{v(x)} f(t) dt = f(v)v' - f(u)u'",
		"description": "King's property simplifies 85% of definite integrals. Leibniz rule differentiates variable integral limits.",
		"subject": "M",
		"chapterName": "Integrals",
		"tags": [
			"kings-property",
			"definite-integral",
			"leibniz-rule"
		],
		"important": true
	},
	{
		"id": "m-de-1",
		"title": "First-Order Linear Differential Equations",
		"latex": "\\frac{dy}{dx} + P(x) y = Q(x) \\implies IF = e^{\\int P(x) dx}, \\quad y\\cdot IF = \\int Q(x)\\cdot IF\\, dx + C",
		"description": "Solution method using integrating factor IF. Homogeneous DE dy/dx = f(y/x) is solved by substituting y = vx.",
		"subject": "M",
		"chapterName": "Differential Equations",
		"tags": [
			"differential-equations",
			"linear-de",
			"integrating-factor"
		],
		"important": true
	},
	{
		"id": "m-vec-1",
		"title": "Dot & Cross Products of Vectors",
		"latex": "\\vec{a}\\cdot\\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta, \\quad \\vec{a}\\times\\vec{b} = |\\vec{a}||\\vec{b}|\\sin\\theta\\,\\hat{n}, \\quad \\text{Proj}_{\\vec{b}}\\vec{a} = \\frac{\\vec{a}\\cdot\\vec{b}}{|\\vec{b}|}",
		"description": "Dot product is scalar; cross product is perpendicular vector with magnitude equal to area of parallelogram.",
		"subject": "M",
		"chapterName": "Vector Algebra",
		"tags": [
			"vectors",
			"dot-product",
			"cross-product",
			"projection"
		],
		"important": true
	},
	{
		"id": "m-vec-2",
		"title": "Scalar & Vector Triple Products",
		"latex": "[\\vec{a}\\, \\vec{b}\\, \\vec{c}] = \\vec{a}\\cdot(\\vec{b}\\times\\vec{c}) = \\text{Volume}, \\quad \\vec{a}\\times(\\vec{b}\\times\\vec{c}) = (\\vec{a}\\cdot\\vec{c})\\vec{b} - (\\vec{a}\\cdot\\vec{b})\\vec{c}",
		"description": "Scalar triple product is zero if vectors are coplanar. Vector triple product obeys BAC-CAB rule.",
		"subject": "M",
		"chapterName": "Vector Algebra",
		"tags": [
			"triple-product",
			"box-product",
			"coplanar",
			"vectors"
		],
		"important": true
	},
	{
		"id": "m-3d-1",
		"title": "Line in 3D Space & Shortest Distance Between Skew Lines",
		"latex": "\\frac{x - x_1}{a} = \\frac{y - y_1}{b} = \\frac{z - z_1}{c}, \\quad d = \\frac{\\left|(\\vec{a}_2 - \\vec{a}_1)\\cdot(\\vec{b}_1\\times\\vec{b}_2)\\right|}{\\left|\\vec{b}_1\\times\\vec{b}_2\\right|}",
		"description": "Shortest perpendicular distance between non-parallel, non-intersecting lines in three dimensions.",
		"subject": "M",
		"chapterName": "Three-dimensional Geometry",
		"tags": [
			"3d-geometry",
			"skew-lines",
			"shortest-distance",
			"lines"
		],
		"important": true
	},
	{
		"id": "m-prob-1",
		"title": "Conditional Probability & Bayes’ Theorem",
		"latex": "P(A|B) = \\frac{P(A\\cap B)}{P(B)}, \\quad P(E_i|A) = \\frac{P(E_i)P(A|E_i)}{\\sum_{j=1}^n P(E_j)P(A|E_j)}",
		"description": "Bayes rule computes posterior probability of event Ei given evidence A under mutually exclusive partition.",
		"subject": "M",
		"chapterName": "Probability",
		"tags": [
			"bayes",
			"conditional-probability",
			"probability"
		],
		"important": true
	},
	{
		"id": "m-prob-2",
		"title": "Binomial Distribution Mean & Variance",
		"latex": "P(X = r) = {}^n C_r p^r q^{n-r}, \\quad \\mu = n p, \\quad \\sigma^2 = n p q, \\quad \\sigma = \\sqrt{n p q}",
		"description": "Number of successes in n independent Bernoulli trials with success probability p and failure q = 1 - p.",
		"subject": "M",
		"chapterName": "Probability",
		"tags": [
			"binomial-distribution",
			"mean",
			"variance",
			"bernoulli"
		],
		"important": true
	},
	{
		"id": "m-stat-1",
		"title": "Variance, Standard Deviation & Coefficient of Variation",
		"latex": "\\sigma^2 = \\frac{\\sum x_i^2}{N} - (\\bar{x})^2 = \\frac{1}{N}\\sum (x_i - \\bar{x})^2, \\quad CV = \\frac{\\sigma}{\\bar{x}}\\times 100\\%",
		"description": "Variance formula for raw observations. Lower CV indicates greater consistency or stability in data.",
		"subject": "M",
		"chapterName": "Statistics",
		"tags": [
			"variance",
			"standard-deviation",
			"mean",
			"cv"
		],
		"important": true
	},
	{
		"id": "m-mat-1",
		"title": "Inverse Matrix, Adjoint Properties & Determinants",
		"latex": "A^{-1} = \\frac{\\text{adj}(A)}{|A|}, \\quad |\\text{adj}(A)| = |A|^{n-1}, \\quad |A\\cdot B| = |A||B|, \\quad (A B)^{-1} = B^{-1} A^{-1}",
		"description": "Adjoint formula for n x n invertible matrix with non-zero determinant |A|.",
		"subject": "M",
		"chapterName": "Matrices",
		"tags": [
			"matrices",
			"inverse",
			"adjoint",
			"determinant"
		],
		"important": true
	},
	{
		"id": "m-det-1",
		"title": "Cramer’s Rule for System of Linear Equations",
		"latex": "x = \\frac{\\Delta_x}{\\Delta}, \\quad y = \\frac{\\Delta_y}{\\Delta}, \\quad z = \\frac{\\Delta_z}{\\Delta} \\quad (\\Delta \\ne 0)",
		"description": "If Delta != 0, unique solution. If Delta = 0 and at least one Delta_i != 0, system has no solution (inconsistent).",
		"subject": "M",
		"chapterName": "Determinants",
		"tags": [
			"cramer-rule",
			"determinants",
			"system-of-equations"
		],
		"important": true
	},
	{
		"id": "m-itf-1",
		"title": "Inverse Trigonometric Identities & Addition",
		"latex": "\\sin^{-1}x + \\cos^{-1}x = \\frac{\\pi}{2}, \\quad \\tan^{-1}x + \\tan^{-1}y = \\tan^{-1}\\left(\\frac{x + y}{1 - x y}\\right) \\;(x y < 1)",
		"description": "Complementary angles sum to pi/2. Valid within principal value branches.",
		"subject": "M",
		"chapterName": "Inverse Trigonometric Functions",
		"tags": [
			"itf",
			"inverse-trig",
			"principal-value"
		],
		"important": true
	}
];
