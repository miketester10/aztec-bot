export enum ValidatorStatus {
  ACTIVE = "Validating",
  EXITED = "Exiting",
  ZOMBIE = "Zombie",
  NONE = "None",
}

export enum ValidatorStatusByAztec {
  ACTIVE = 1,
  EXITED = 3,
}

export enum ValidatorStatusMessage {
  ACTIVE = "Active 🟢",
  EXITED = "Exited 🔴",
  ZOMBIE = "Zombie 🧟‍♂️",
  NONE = "None ⚠️",
}
