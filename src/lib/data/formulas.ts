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
	// ==========================================
	// PHYSICS
	// ==========================================
	{
		id: 'p-kin-1',
		title: 'Equations of Motion (Constant a)',
		latex: 'v = u + at, \\quad s = ut + \\frac{1}{2}at^2, \\quad v^2 = u^2 + 2as',
		description: 'Valid only when acceleration is constant throughout the motion.',
		subject: 'P',
		chapterName: 'Kinematics',
		tags: ['velocity', 'displacement', 'acceleration', '1d', 'kinematics'],
		important: true
	},
	{
		id: 'p-kin-2',
		title: 'Projectile Motion Key Relations',
		latex: 'T = \\frac{2u\\sin\\theta}{g}, \\quad H_{max} = \\frac{u^2\\sin^2\\theta}{2g}, \\quad R = \\frac{u^2\\sin 2\\theta}{g}',
		description: 'Time of flight, maximum height, and horizontal range on flat ground.',
		subject: 'P',
		chapterName: 'Kinematics',
		tags: ['projectile', 'range', 'height', 'time-of-flight'],
		important: true
	},
	{
		id: 'p-nlm-1',
		title: "Newton's Second Law & Momentum",
		latex: '\\vec{F}_{ext} = \\frac{d\\vec{p}}{dt} = m\\vec{a}_{cm}, \\quad \\vec{J} = \\int \\vec{F} dt = \\Delta\\vec{p}',
		description: 'Impulse equals total change in linear momentum.',
		subject: 'P',
		chapterName: "Newton's Laws of Motion",
		tags: ['force', 'impulse', 'momentum', 'laws-of-motion'],
		important: true
	},
	{
		id: 'p-wpe-1',
		title: 'Work-Energy Theorem & Power',
		latex: 'W_{all} = \\Delta K = K_f - K_i, \\quad P = \\vec{F} \\cdot \\vec{v} = \\frac{dW}{dt}',
		description: 'Work done by all forces (conservative + non-conservative + pseudo) equals change in kinetic energy.',
		subject: 'P',
		chapterName: 'Work, Power and Energy',
		tags: ['work', 'kinetic-energy', 'power', 'conservation'],
		important: true
	},
	{
		id: 'p-com-1',
		title: 'Center of Mass Coordinates',
		latex: '\\vec{R}_{cm} = \\frac{\\sum m_i \\vec{r}_i}{\\sum m_i} = \\frac{\\int \\vec{r}\\, dm}{\\int dm}',
		description: 'Position vector of the center of mass for discrete and continuous mass distributions.',
		subject: 'P',
		chapterName: 'Centre of Mass and Conservation of Momentum',
		tags: ['com', 'center-of-mass', 'mass-distribution', 'momentum'],
		important: true
	},
	{
		id: 'p-com-2',
		title: '1D Elastic Collision Velocities',
		latex: 'v_1 = \\frac{m_1 - m_2}{m_1 + m_2}u_1 + \\frac{2m_2}{m_1 + m_2}u_2, \\quad e = \\frac{v_2 - v_1}{u_1 - u_2} = 1',
		description: 'Final velocities after perfectly elastic collision (coefficient of restitution e = 1).',
		subject: 'P',
		chapterName: 'Centre of Mass and Conservation of Momentum',
		tags: ['collision', 'elastic', 'restitution', 'momentum'],
		important: true
	},
	{
		id: 'p-rot-1',
		title: 'Parallel & Perpendicular Axis Theorems',
		latex: 'I = I_{cm} + M d^2, \\qquad I_z = I_x + I_y \\quad \\text{(Planar laminas in } xy \\text{ plane)}',
		description: 'Parallel axis theorem holds for any rigid body; Perpendicular axis theorem holds only for 2D flat plates.',
		subject: 'P',
		chapterName: 'Rotational Dynamics',
		tags: ['moment-of-inertia', 'parallel-axis', 'perpendicular-axis', 'rotation'],
		important: true
	},
	{
		id: 'p-rot-2',
		title: 'Rolling Motion Kinetic Energy',
		latex: 'K = \\frac{1}{2}M v_{cm}^2 + \\frac{1}{2}I_{cm}\\omega^2 = \\frac{1}{2}M v_{cm}^2 \\left(1 + \\frac{k^2}{R^2}\\right)',
		description: 'Pure rolling on surface (v_cm = R * omega). k is radius of gyration.',
		subject: 'P',
		chapterName: 'Rotational Dynamics',
		tags: ['pure-rolling', 'energy', 'rotation', 'gyration'],
		important: true
	},
	{
		id: 'p-grav-1',
		title: 'Gravitational Potential & Escape Velocity',
		latex: 'V(r) = -\\frac{G M}{r}, \\quad v_e = \\sqrt{\\frac{2GM}{R}} = \\sqrt{2gR} \\approx 11.2\\text{ km/s}',
		description: 'Orbital velocity at surface v_o = sqrt(GM/R); v_escape = sqrt(2) * v_orbital.',
		subject: 'P',
		chapterName: 'Gravitation',
		tags: ['gravity', 'potential', 'escape-velocity', 'orbital'],
		important: true
	},
	{
		id: 'p-shm-1',
		title: 'Simple Harmonic Motion Kinematics',
		latex: 'x(t) = A\\sin(\\omega t + \\phi), \\quad v = \\omega\\sqrt{A^2 - x^2}, \\quad T = 2\\pi\\sqrt{\\frac{m}{k}}',
		description: 'Time period of simple pendulum: T = 2pi * sqrt(L/g). Maximum acceleration a_max = omega^2 * A.',
		subject: 'P',
		chapterName: 'Simple Harmonic Motion',
		tags: ['shm', 'oscillation', 'spring', 'time-period', 'amplitude'],
		important: true
	},
	{
		id: 'p-elec-1',
		title: "Coulomb's Law & Field on Axis of Ring",
		latex: 'E_{ring} = \\frac{1}{4\\pi\\epsilon_0}\\frac{Q x}{(R^2 + x^2)^{3/2}}, \\quad E_{max} \\text{ at } x = \\pm \\frac{R}{\\sqrt{2}}',
		description: 'Electric field due to uniform circular charged ring at axial distance x.',
		subject: 'P',
		chapterName: 'Electrostatics',
		tags: ['electrostatics', 'electric-field', 'ring', 'maxima'],
		important: true
	},
	{
		id: 'p-elec-2',
		title: "Gauss's Law & Dipole Field",
		latex: '\\oint \\vec{E} \\cdot d\\vec{A} = \\frac{q_{encl}}{\\epsilon_0}, \\quad E_{axial} = \\frac{2kp}{r^3}, \\quad E_{equatorial} = \\frac{kp}{r^3}',
		description: 'Short electric dipole field drops as 1/r^3. Torque tau = p x E, Potential U = -p . E.',
		subject: 'P',
		chapterName: 'Electrostatics',
		tags: ['gauss-law', 'dipole', 'flux', 'potential'],
		important: true
	},
	{
		id: 'p-cap-1',
		title: 'Capacitance & Stored Energy',
		latex: 'C = \\frac{\\kappa \\epsilon_0 A}{d}, \\quad U = \\frac{1}{2}CV^2 = \\frac{Q^2}{2C}, \\quad u_E = \\frac{1}{2}\\epsilon_0 E^2',
		description: 'Energy density in electrostatic field u_E. Force between capacitor plates F = Q^2 / (2 eps_0 A).',
		subject: 'P',
		chapterName: 'Capacitance',
		tags: ['capacitor', 'dielectric', 'energy-density'],
		important: true
	},
	{
		id: 'p-curr-1',
		title: "Drift Velocity & Ohm's Law",
		latex: 'I = n e A v_d, \\quad v_d = \\frac{e E \\tau}{m}, \\quad \\vec{j} = \\sigma \\vec{E} = \\frac{\\vec{E}}{\\rho}',
		description: 'Current density j = I/A. Relaxation time tau determines electrical resistivity rho.',
		subject: 'P',
		chapterName: 'Current Electricity',
		tags: ['drift-velocity', 'ohms-law', 'current', 'resistivity'],
		important: true
	},
	{
		id: 'p-mag-1',
		title: 'Magnetic Field of Current Loops & Wires',
		latex: 'B_{wire} = \\frac{\\mu_0 I}{2\\pi d}, \\quad B_{center} = \\frac{\\mu_0 I}{2R}, \\quad B_{axis} = \\frac{\\mu_0 I R^2}{2(R^2 + x^2)^{3/2}}',
		description: 'Magnetic field from straight long wire and circular loop along its axis.',
		subject: 'P',
		chapterName: 'Magnetic Field',
		tags: ['biot-savart', 'magnetic-field', 'ampere', 'wire', 'solenoid'],
		important: true
	},
	{
		id: 'p-emi-1',
		title: "Faraday's Law & Motional EMF",
		latex: '\\mathcal{E} = -\\frac{d\\Phi_B}{dt}, \\quad \\mathcal{E}_{motional} = B v l, \\quad U_{ind} = \\frac{1}{2}L I^2',
		description: 'Self-inductance of solenoid L = mu_0 * n^2 * A * l. Magnetic energy density u_B = B^2 / (2 mu_0).',
		subject: 'P',
		chapterName: 'Electromagnetic Induction',
		tags: ['faraday', 'lenz-law', 'induction', 'emf', 'inductance'],
		important: true
	},
	{
		id: 'p-opt-1',
		title: 'Snell’s Law & Lens Maker’s Formula',
		latex: '\\mu_1 \\sin\\theta_1 = \\mu_2 \\sin\\theta_2, \\quad \\frac{1}{f} = (\\mu - 1)\\left(\\frac{1}{R_1} - \\frac{1}{R_2}\\right)',
		description: 'Refraction and focal length of thin lens in medium.',
		subject: 'P',
		chapterName: 'Geometrical Optics',
		tags: ['refraction', 'snells-law', 'lens-maker', 'focal-length', 'optics'],
		important: true
	},
	{
		id: 'p-mod-1',
		title: 'Photoelectric Effect & Bohr Atom',
		latex: 'K_{max} = h\\nu - \\phi = eV_0, \\quad r_n = 0.529\\frac{n^2}{Z}\\,\\text{Å}, \\quad E_n = -13.6\\frac{Z^2}{n^2}\\,\\text{eV}',
		description: 'Einstein photoelectric equation and Bohr stationary orbits for hydrogen-like atoms.',
		subject: 'P',
		chapterName: 'Modern Physics',
		tags: ['photoelectric', 'bohr', 'quantum', 'de-broglie', 'work-function'],
		important: true
	},

	// ==========================================
	// CHEMISTRY
	// ==========================================
	{
		id: 'c-thermo-1',
		title: 'Gibbs Free Energy & Equilibrium',
		latex: '\\Delta G^\\circ = \\Delta H^\\circ - T\\Delta S^\\circ = -RT \\ln K_{eq} = -2.303 RT \\log_{10} K_{eq}',
		description: 'Spontaneity condition: Delta G < 0 at constant T and P.',
		subject: 'C',
		chapterName: 'Thermodynamics',
		tags: ['gibbs-free-energy', 'entropy', 'enthalpy', 'equilibrium', 'spontaneity'],
		important: true
	},
	{
		id: 'c-equil-1',
		title: 'van ’t Hoff Equation & Le Chatelier',
		latex: '\\ln\\left(\\frac{K_2}{K_1}\\right) = \\frac{\\Delta H^\\circ}{R}\\left(\\frac{1}{T_1} - \\frac{1}{T_2}\\right), \\quad K_p = K_c(RT)^{\\Delta n_g}',
		description: 'Temperature dependence of equilibrium constant K.',
		subject: 'C',
		chapterName: 'Chemical Equilibrium',
		tags: ['equilibrium', 'vant-hoff', 'kp-kc', 'temperature'],
		important: true
	},
	{
		id: 'c-ionic-1',
		title: 'Henderson-Hasselbalch Buffer Equation',
		latex: '\\text{pH} = \\text{pK}_a + \\log_{10}\\left(\\frac{[\\text{Conjugate Base}]}{[\\text{Weak Acid}]}\\right)',
		description: 'Used for acidic buffers. For basic buffer: pOH = pKb + log([Salt]/[Base]).',
		subject: 'C',
		chapterName: 'Ionic Equilibrium',
		tags: ['ph', 'buffer', 'henderson', 'hydrolysis', 'ksp'],
		important: true
	},
	{
		id: 'c-electro-1',
		title: 'Nernst Equation (at 298 K)',
		latex: 'E_{cell} = E^\\circ_{cell} - \\frac{0.0591}{n} \\log_{10} Q, \\quad \\Delta G^\\circ = -n F E^\\circ_{cell}',
		description: 'Relates cell potential to reaction quotient Q and standard cell potential at 25 deg C.',
		subject: 'C',
		chapterName: 'Electrochemistry',
		tags: ['nernst', 'electrochemistry', 'cell-potential', 'gibbs', 'faraday'],
		important: true
	},
	{
		id: 'c-electro-2',
		title: 'Kohlrausch’s Law of Independent Migration',
		latex: '\\Lambda_m^\\circ = \\nu_+ \\lambda_+^\\circ + \\nu_- \\lambda_-^\\circ, \\quad \\alpha = \\frac{\\Lambda_m}{\\Lambda_m^\\circ}',
		description: 'Molar conductivity at infinite dilution and degree of dissociation for weak electrolytes.',
		subject: 'C',
		chapterName: 'Electrochemistry',
		tags: ['kohlrausch', 'conductivity', 'dissociation'],
		important: true
	},
	{
		id: 'c-kin-1',
		title: 'First-Order Kinetics & Half-Life',
		latex: 'k = \\frac{2.303}{t}\\log_{10}\\left(\\frac{[A]_0}{[A]_t}\\right), \\quad t_{1/2} = \\frac{\\ln 2}{k} = \\frac{0.693}{k}',
		description: 'Half-life is independent of initial concentration [A]_0 for first-order reactions.',
		subject: 'C',
		chapterName: 'Chemical Kinetics',
		tags: ['first-order', 'half-life', 'rate-constant', 'kinetics'],
		important: true
	},
	{
		id: 'c-kin-2',
		title: 'Arrhenius Equation & Activation Energy',
		latex: 'k = A e^{-E_a / RT}, \\quad \\log_{10}\\left(\\frac{k_2}{k_1}\\right) = \\frac{E_a}{2.303 R}\\left(\\frac{1}{T_1} - \\frac{1}{T_2}\\right)',
		description: 'Temperature dependence of reaction rate. Ea is the activation energy in J/mol.',
		subject: 'C',
		chapterName: 'Chemical Kinetics',
		tags: ['arrhenius', 'activation-energy', 'rate', 'temperature'],
		important: true
	},
	{
		id: 'c-sol-1',
		title: 'Colligative Properties & van ’t Hoff Factor',
		latex: '\\frac{P^\\circ - P_s}{P^\\circ} = i \\chi_B, \\quad \\Delta T_b = i K_b m, \\quad \\Delta T_f = i K_f m, \\quad \\pi = i C R T',
		description: 'Relative lowering of vapour pressure, elevation in boiling point, depression in freezing point, and osmotic pressure.',
		subject: 'C',
		chapterName: 'Solutions',
		tags: ['colligative', 'raoult', 'osmotic-pressure', 'vant-hoff-factor'],
		important: true
	},
	{
		id: 'c-coord-1',
		title: 'Spin-Only Magnetic Moment',
		latex: '\\mu = \\sqrt{n(n + 2)}\\,\\text{BM}, \\quad \\Delta_t = \\frac{4}{9}\\Delta_o',
		description: 'n is the number of unpaired electrons. BM = Bohr Magneton. Crystal field splitting in tetrahedral vs octahedral complexes.',
		subject: 'C',
		chapterName: 'Coordination Compounds',
		tags: ['coordination', 'magnetic-moment', 'bohr-magneton', 'cft', 'crystal-field'],
		important: true
	},

	// ==========================================
	// MATHEMATICS
	// ==========================================
	{
		id: 'm-calc-1',
		title: 'Standard Indefinite Integrals',
		latex: '\\int \\frac{dx}{x^2 + a^2} = \\frac{1}{a}\\arctan\\left(\\frac{x}{a}\\right), \\quad \\int \\frac{dx}{\\sqrt{a^2 - x^2}} = \\arcsin\\left(\\frac{x}{a}\\right)',
		description: 'Essential reciprocal quadratic standard forms.',
		subject: 'M',
		chapterName: 'Indefinite Integration',
		tags: ['integration', 'calculus', 'arctangent', 'arcsin', 'standard-forms'],
		important: true
	},
	{
		id: 'm-calc-2',
		title: 'Integration by Parts (ILATE Rule)',
		latex: '\\int u v\\, dx = u \\int v\\, dx - \\int \\left(u\' \\int v\\, dx\\right) dx, \\quad \\int e^x [f(x) + f\'(x)]\\, dx = e^x f(x) + C',
		description: 'ILATE priority: Inverse > Logarithmic > Algebraic > Trigonometric > Exponential.',
		subject: 'M',
		chapterName: 'Indefinite Integration',
		tags: ['integration-by-parts', 'ilate', 'exponential-form'],
		important: true
	},
	{
		id: 'm-calc-3',
		title: 'King’s Property & Leibniz Rule',
		latex: '\\int_a^b f(x) dx = \\int_a^b f(a + b - x) dx, \\quad \\frac{d}{dx}\\int_{u(x)}^{v(x)} f(t) dt = f(v)v\' - f(u)u\'',
		description: "King's property simplifies 80% of symmetric JEE definite integrals. Leibniz rule differentiates variable limits.",
		subject: 'M',
		chapterName: 'Definite Integration',
		tags: ['kings-rule', 'definite-integral', 'leibniz-rule', 'symmetry'],
		important: true
	},
	{
		id: 'm-conic-1',
		title: 'Standard Conic Tangents in Slope Form',
		latex: 'y = mx \\pm a\\sqrt{1 + m^2} \\text{ (Circle)}, \\quad y = mx + \\frac{a}{m} \\text{ (Parabola)}, \\quad y = mx \\pm \\sqrt{a^2 m^2 \\pm b^2}',
		description: 'Slope form tangents for Circle (x^2+y^2=a^2), Parabola (y^2=4ax), Ellipse (+b^2), and Hyperbola (-b^2).',
		subject: 'M',
		chapterName: 'Circles',
		tags: ['tangent', 'conics', 'slope-form', 'circle', 'parabola', 'ellipse', 'hyperbola'],
		important: true
	},
	{
		id: 'm-vec-1',
		title: 'Shortest Distance Between Skew Lines',
		latex: 'd = \\frac{\\left|(\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2)\\right|}{\\left|\\vec{b}_1 \\times \\vec{b}_2\\right|}',
		description: 'Shortest perpendicular distance between non-parallel, non-intersecting 3D lines.',
		subject: 'M',
		chapterName: '3D Geometry',
		tags: ['skew-lines', 'vectors', 'shortest-distance', '3d-geometry', 'cross-product'],
		important: true
	},
	{
		id: 'm-vec-2',
		title: 'Vector Triple Product & Scalar Triple Product',
		latex: '\\vec{a} \\times (\\vec{b} \\times \\vec{c}) = (\\vec{a} \\cdot \\vec{c})\\vec{b} - (\\vec{a} \\cdot \\vec{b})\\vec{c}, \\quad [\\vec{a}\\, \\vec{b}\\, \\vec{c}] = \\vec{a} \\cdot (\\vec{b} \\times \\vec{c})',
		description: 'Scalar triple product represents volume of parallelepiped. Zero if coplanar.',
		subject: 'M',
		chapterName: 'Vector Algebra',
		tags: ['triple-product', 'coplanar', 'parallelepiped', 'vectors'],
		important: true
	},
	{
		id: 'm-quad-1',
		title: 'Quadratic Equations & Roots Location',
		latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}, \\quad \\alpha + \\beta = -\\frac{b}{a}, \\quad \\alpha\\beta = \\frac{c}{a}',
		description: 'Condition for both roots > k: D >= 0, -b/(2a) > k, and a*f(k) > 0.',
		subject: 'M',
		chapterName: 'Quadratic Equations',
		tags: ['quadratic', 'roots', 'discriminant', 'location-of-roots'],
		important: true
	},
	{
		id: 'm-cx-1',
		title: 'Complex Numbers & Cube Roots of Unity',
		latex: 'z = r e^{i\\theta} = r(\\cos\\theta + i\\sin\\theta), \\quad 1 + \\omega + \\omega^2 = 0, \\quad \\omega^3 = 1',
		description: 'De Moivre: (cos theta + i sin theta)^n = cos(n theta) + i sin(n theta). omega = (-1 + i*sqrt(3))/2.',
		subject: 'M',
		chapterName: 'Complex Numbers',
		tags: ['complex-numbers', 'euler', 'omega', 'roots-of-unity', 'de-moivre'],
		important: true
	},
	{
		id: 'm-seq-1',
		title: 'Arithmetic & Geometric Progressions',
		latex: 'S_n^{AP} = \\frac{n}{2}[2a + (n-1)d], \\quad S_\\infty^{GP} = \\frac{a}{1 - r} \\quad (|r| < 1), \\quad AM \\ge GM \\ge HM',
		description: 'AM >= GM inequality holds for positive real numbers with equality iff all numbers are equal.',
		subject: 'M',
		chapterName: 'Sequence and Series',
		tags: ['ap', 'gp', 'am-gm', 'series', 'sum-to-infinity'],
		important: true
	},
	{
		id: 'm-bin-1',
		title: 'Binomial Theorem General Term',
		latex: '(x + y)^n = \\sum_{r=0}^n \\binom{n}{r} x^{n-r} y^r, \\quad T_{r+1} = \\binom{n}{r} x^{n-r} y^r, \\quad \\sum_{r=0}^n \\binom{n}{r} = 2^n',
		description: 'General term T_{r+1}. Greatest binomial coefficient is the middle term.',
		subject: 'M',
		chapterName: 'Binomial Theorem',
		tags: ['binomial', 'combinations', 'expansion', 'middle-term'],
		important: true
	}
];
