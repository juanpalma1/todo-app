# Todo App Assumptions
## by Juan Palma

Hi there,

Below I outline the assumptions made during the creation of my Todo App.
I hope this document makes the code easier to read.

- A `title` can't have dashes.

- A `title` must be unique.
  - Whitespace is removed to check uniqueness.
  - If the capitalization of the new `title` doesn't match any
    existing `title`, the new `title` is considered unique.

- A `title` must have at least an alphanumeric character.

- `No Due Date` groups are moved to the top of their respective group list.

- If a `todo` is created with or changed to have a date field with a value, the value
cannot be deleted, only changed.
  - eg, If the user wants a `todo` with an already existing `title` but with no date,
    the user will have to delete the existing, dated `todo` and create an undated one.

- If the user adds a description to a `todo`, the description cannot be deleted, only changed.

- If a `todo` is completed, and then is toggled back to not completed,
  it will stay at the bottom of the list provided it's not removable.

- The Todo App passes ESLint with Launch School's configuration except for some negligible errors.

- The Todo App runs successfully in strict mode.

- The Todo App runs successfully on Google Chrome. Didn't checked cross-browser compatibility.