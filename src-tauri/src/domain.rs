use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentEnvelope {
    pub state_version: u32,
    pub saved_at: String,
    /// The front-end schema is intentionally lossless during migration. Rust
    /// validates and stores the complete document without stripping unknown
    /// feature fields introduced in later application phases.
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyllabusSeed {
    pub subjects: Vec<SubjectSeed>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubjectSeed {
    pub code: String,
    pub name: String,
    pub short: String,
    pub accent: String,
    pub modules: Vec<ModuleSeed>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleSeed {
    pub id: u32,
    pub name: String,
    pub chapters: Vec<ChapterSeed>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChapterSeed {
    pub id: u32,
    pub name: String,
    pub exercises: Vec<ExerciseSeed>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExerciseSeed {
    pub code: String,
    pub name: String,
    pub question_count: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyllabusSummary {
    pub subjects: usize,
    pub modules: usize,
    pub chapters: usize,
    pub questions: u32,
}

pub fn summarize_syllabus(seed: SyllabusSeed) -> SyllabusSummary {
    let modules = seed
        .subjects
        .iter()
        .map(|subject| subject.modules.len())
        .sum();
    let chapters = seed
        .subjects
        .iter()
        .flat_map(|subject| &subject.modules)
        .map(|module| module.chapters.len())
        .sum();
    let questions = seed
        .subjects
        .iter()
        .flat_map(|subject| &subject.modules)
        .flat_map(|module| &module.chapters)
        .flat_map(|chapter| &chapter.exercises)
        .map(|exercise| exercise.question_count)
        .sum();
    SyllabusSummary {
        subjects: seed.subjects.len(),
        modules,
        chapters,
        questions,
    }
}
