import CodeEditor from "../editor/code_editor"

const CodeEditorHook = {
  mounted() {
    // TODO: validate dataset
    const opts = JSON.parse(this.el.dataset.opts)

    this.codeEditor = new CodeEditor(
      this.el,
      this.el.dataset.path,
      this.el.dataset.value,
      opts
    )

    this.codeEditor.onMount((monaco) => {
      if (this.el.dataset.changeEvent && this.el.dataset.changeEvent !== "") {
        this.codeEditor.standalone_code_editor.onDidChangeModelContent(
          (event) => {
            if (this.el.dataset.target && this.el.dataset.target !== "") {
              this.pushEventTo(
                this.el.dataset.target,
                this.el.dataset.changeEvent,
                {
                  model: {
                    client_id: this.el.dataset.userId,
                    path: this.el.dataset.path,
                    version: event.versionId,
                    changes: event.changes,
                  },
                }
              )
            } else {
              this.pushEvent(this.el.dataset.changeEvent, {
                model: {
                  client_id: this.el.dataset.userId,
                  path: this.el.dataset.path,
                  version: event.versionId,
                  changes: event.changes,
                },
              })
            }
          }
        )
      }

      this.handleEvent(
        "lme:change_language:" + this.el.dataset.path,
        (data) => {
          const model = this.codeEditor.standalone_code_editor.getModel()
          console.log("MODEL: ", model)

          if (model.getLanguageId() !== data.mimeTypeOrLanguageId) {
            monaco.editor.setModelLanguage(model, data.mimeTypeOrLanguageId)
          }
        }
      )

      this.handleEvent("lme:set_value:" + this.el.dataset.path, (data) => {
        this.codeEditor.standalone_code_editor.setValue(data.value)
      })

      this.handleEvent("lme:update_model" + this.el.dataset.path, (data) => {
        const model = this.codeEditor.standalone_code_editor.getModel()
        console.log(model)
        // this.pushEvent("send_model", {model: model})
      })

      this.handleEvent("lme:applyEdits:" + this.el.dataset.path, (data) => {
        // this will apply the changes made by one use.
        // const { client_id, changes, version } = data
        console.log("This was called", this.el.dataset.userId, "someting")
        const user = data.user_id
        const changes = data.changes
        const version = data.version

        if (user == this.el.dataset) return

        const model = this.codeEditor.standalone_code_editor.getModel()
        if (!model || !changes || changes.length === 0) return

        const currentVersion = model.getVersionId()
        if (version && version < currentVersion) {
          console.warn("Stale update ignored", { version, currentVersion })
          return
        }
        console.log("changes", changes)
        const operations = changes.map((c) => ({
          range: new monaco.Range(
            c.range.startLineNumber,
            c.range.startColumn,
            c.range.endLineNumber,
            c.range.endColumn
          ),
          text: c.text,
          forceMoveMarkers: true,
        }))

        this.supress = true

        try {
          console.log("Attempting updates")
          model.pushEditOperations([], operations, () => null)
        } finally {
          this.supress = false
        }
      })

      this.handleEvent(
        "lme:pushEditOperations:" + this.el.dataset.path,
        (data) => {
          // this sends updates to all other users.
          console.log(data, "pushEditOperations")
        }
      )

      this.el.querySelectorAll("textarea").forEach((textarea) => {
        textarea.setAttribute(
          "name",
          "live_monaco_editor[" + this.el.dataset.path + "]"
        )
      })

      this.el.removeAttribute("data-value")
      this.el.removeAttribute("data-opts")

      this.el.dispatchEvent(
        new CustomEvent("lme:editor_mounted", {
          detail: { hook: this, editor: this.codeEditor },
          bubbles: true,
        })
      )
    })

    if (!this.codeEditor.isMounted()) {
      this.codeEditor.mount()
    }
  },

  destroyed() {
    if (this.codeEditor) {
      this.codeEditor.dispose()
    }
  },
}

export { CodeEditorHook }
