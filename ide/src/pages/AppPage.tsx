import Editor from '@/components/editor';
import { bond, box, Box, store } from '@/dataflow';
import { list_files, read_file, write_file, delete_file, rename_file, list_apps } from '@/ide';
import { newEditor } from '@/model';
import * as Fluent from '@fluentui/react';
import makeLogo from '@static/make-logo.svg';
import React from 'react';
import { matchPath } from 'react-router-dom';
import { validateFileName } from '@/utils/validation';

type FileActionsProps = {
  deleteFile: () => Promise<void>
  renameFile: (fileName: string) => Promise<void>
  activeFileB: Box<string>
}

const FileActions = bond(({ deleteFile, renameFile, activeFileB }: FileActionsProps) => {
  const
    onDeleteFile = () => {
      store.dialogB({
        title: 'Delete File',
        content: (
          <Fluent.DialogContent styles={{ header: { display: 'none' } }}>
            <Fluent.Text block>Are you sure you want to proceed?</Fluent.Text>
          </Fluent.DialogContent>
        ),
        footer: <Fluent.PrimaryButton text='Submit' onClick={deleteFile} />
      })
    },
    onRenameFile = () => {
      let newName = ''
      const
        onRenameChange = (_e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newVal = '') => {
          newName = newVal
          const dialog = store.dialogB()
          if (dialog) store.dialogB({ ...dialog, footer: <Fluent.PrimaryButton text='Submit' onClick={submit} disabled={!!validateFileName(newName)} /> })
        },
        submit = () => renameFile(newName)

      store.dialogB({
        title: 'Rename File',
        content: (
          <Fluent.DialogContent styles={{ header: { display: 'none' }, inner: { minHeight: 85 } }}>
            <Fluent.TextField
              label='File name'
              suffix='.py'
              defaultValue={activeFileB().substring(0, activeFileB().length - 3)}
              required
              onGetErrorMessage={validateFileName}
              validateOnLoad={false}
              onChange={onRenameChange}
            />
          </Fluent.DialogContent>
        ),
        footer: <Fluent.PrimaryButton text='Submit' onClick={submit} disabled={!!activeFileB()} />
      })
    },
    commands: Fluent.ICommandBarItemProps[] = [
      {
        key: 'delete',
        iconOnly: true,
        iconProps: { iconName: 'Delete' },
        onClick: onDeleteFile,
        tooltipHostProps: { content: 'Delete File' },
        buttonStyles: { root: { background: 'transparent' } },
      },
      {
        key: 'rename',
        iconOnly: true,
        iconProps: { iconName: 'Edit' },
        tooltipHostProps: { content: 'Rename File' },
        onClick: onRenameFile,
        buttonStyles: { root: { background: 'transparent' } }
      }
    ],
    render = () => (
      <div style={{ position: 'absolute', top: 0, right: 0 }}>
        <Fluent.CommandBar items={commands} styles={{ root: { background: 'transparent' } }} />
      </div>
    )
  return { render, activeFileB }
})

type FileToolbarProps = {
  filesB: Box<string[]>
  activeFileB: Box<string>
  addNewFile: (fileName: string) => Promise<void>
  readFile: (fileName: string) => Promise<void>
}

const FileToolbar = bond(({ addNewFile, readFile, filesB, activeFileB }: FileToolbarProps) => {
  const
    onAddFile = () => {
      let fileName = ''
      const
        onNameChange = (_e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newVal = '') => {
          fileName = newVal
          const dialog = store.dialogB()
          if (dialog) store.dialogB({ ...dialog, footer: <Fluent.PrimaryButton text='Submit' onClick={submit} disabled={!!validateFileName(fileName)} /> })
        },
        submit = () => addNewFile(fileName)

      store.dialogB({
        title: 'Add new file',
        content: (
          <Fluent.DialogContent styles={{ header: { display: 'none' }, inner: { minHeight: 85 } }}>
            <Fluent.TextField
              label='File name'
              suffix='.py'
              required
              onGetErrorMessage={validateFileName}
              validateOnLoad={false}
              onChange={onNameChange}
            />
          </Fluent.DialogContent>
        ),
        footer: <Fluent.PrimaryButton text='Submit' onClick={submit} disabled />
      })
    },
    onLinkClick = (item?: Fluent.PivotItem) => {
      if (!item) return
      const selectedFile = item.props.itemKey || 'app.py'
      activeFileB(selectedFile)
      readFile(item.props.itemKey || 'app.py')
    },
    render = () => (
      <>
        <Fluent.Stack horizontal verticalAlign='center'>
          <Fluent.Pivot selectedKey={activeFileB()} linkSize={Fluent.PivotLinkSize.large} onLinkClick={onLinkClick}>
            {filesB().map(f => <Fluent.PivotItem key={f} itemKey={f.replace(/ \*/g, '')} headerText={f} />)}
          </Fluent.Pivot>
          <Fluent.TooltipHost content="Add another file" id='add-file-tooltip'>
            <Fluent.IconButton data-test='add-file' iconProps={{ iconName: 'Add' }} onClick={onAddFile} />
          </Fluent.TooltipHost>
        </Fluent.Stack>
      </>
    )

  return { render, filesB, activeFileB }
})

enum ViewType {
  SPLIT = 'split',
  CODE = 'code',
  PREVIEW = 'preview',
}

type View = 'editor' | 'app'

type AppPageHeaderProps = {
  appName: string,
  changeViewStyle: (viewStyle: ViewType) => void
}

const AppPageHeader = bond(({ appName, changeViewStyle }: AppPageHeaderProps) => {
  const
    onLinkClick = (item?: Fluent.PivotItem) => {
      if (!item?.props.itemKey) throw new Error('PivotItem itemKey must be specified')
      changeViewStyle(item.props.itemKey as ViewType)
    },
    render = () => (
      <Fluent.Stack horizontal horizontalAlign='space-between' verticalAlign='center' styles={{ root: { margin: '0px 15px' } }}>
        <Fluent.Stack horizontal verticalAlign='center'>
          <Fluent.Image src={makeLogo} width={40} />
          <Fluent.Text variant='xxLargePlus' styles={{ root: { padding: 15 } }}>{appName}</Fluent.Text>
        </Fluent.Stack>
        <Fluent.Pivot onLinkClick={onLinkClick} linkSize={Fluent.PivotLinkSize.large}>
          <Fluent.PivotItem itemKey={ViewType.SPLIT} itemIcon='DoubleColumnEdit' />
          <Fluent.PivotItem itemKey={ViewType.CODE} itemIcon='Edit' />
          <Fluent.PivotItem itemKey={ViewType.PREVIEW} itemIcon='TVMonitor' />
        </Fluent.Pivot>
      </Fluent.Stack>
    )
  return { render }
})

const
  commonStyles: React.CSSProperties = { height: '100%', transition: 'width .5s, opacity .5s' },
  viewStyles: { [K in ViewType]: { [K in View]: React.CSSProperties } } = {
    split: {
      editor: { width: '50%' },
      app: { width: '50%' }
    },
    code: {
      editor: { width: '100%' },
      app: { width: 0, opacity: 0 }
    },
    preview: {
      editor: { width: 0, opacity: 0 },
      app: { width: '100%' }
    },
  }


export default bond(() => {
  const
    appName = matchPath<{ name: string }>(window.location.pathname, { path: "/app/:name" })?.params.name || 'Untitled',
    viewStyleB = box<ViewType>(ViewType.SPLIT),
    filesB = box<string[]>([]),
    activeFileB = box('app.py'),
    editor = newEditor(appName),
    isLoadingB = box(true),
    loadFiles = async () => {
      const files = await list_files(appName)
      filesB(files)
      if (files.length) {
        const activeFile = files[0];
        activeFileB(activeFile)
        await readFile(activeFile)
      }
    },
    addNewFile = async (fileName: string) => {
      fileName = `${fileName}.py`
      const content = ''
      await write_file(appName, fileName, content)
      await loadFiles()
      editor.contentB(content)
      store.dialogB(null)
    },
    readFile = async (fileName: string) => {
      const content = await read_file(appName, fileName)
      editor.contentB(content)
      onDirtyChange(false)
    },
    deleteFile = async () => {
      await delete_file(appName, activeFileB())
      await loadFiles()
      store.dialogB(null)
    },
    renameFile = async (newName: string) => {
      newName = `${newName}.py`
      await rename_file(appName, activeFileB(), newName)
      activeFileB(newName)
      await loadFiles()
      store.dialogB(null)
    },
    onContentChange = (newContent: string) => write_file(appName, activeFileB(), newContent),
    onDirtyChange = (isDirty: boolean) => {
      filesB(filesB().map(f => {
        // TODO: refactor using reasonable CSS
        return isDirty && f.startsWith(activeFileB())
          ? f.endsWith('*') ? f : `${f} *`
          : f.replace(/ \*/g, '')
      }))
    },
    init = async () => {
      await editor.createAppIfNotExists()
      await loadFiles()

      try {
        await editor.startApp()
      }
      catch (error) {
        /* noop */
      }
      finally {
        isLoadingB(false)
      }
    },
    render = () => (
      <>
        <AppPageHeader appName={appName} changeViewStyle={viewStyleB} />
        {
          isLoadingB()
            ? (
              <Fluent.Stack horizontalAlign='center' verticalAlign='center' styles={{ root: { height: '80vh' } }}>
                <Fluent.Spinner label='Loading editor' size={Fluent.SpinnerSize.large} />
              </Fluent.Stack>
            )
            : (
              <>
                <FileToolbar addNewFile={addNewFile} readFile={readFile} filesB={filesB} activeFileB={activeFileB} />
                <Fluent.Stack horizontal styles={{ root: { marginTop: 5, width: '100%', height: 'calc(100vh - 122px)' } }}>
                  <div data-test='editor-window' style={{ position: 'relative', ...commonStyles, ...viewStyles[viewStyleB()].editor }}>
                    <Editor contentB={editor.contentB} onContentChange={onContentChange} onDirtyChange={onDirtyChange} />
                    <FileActions deleteFile={deleteFile} renameFile={renameFile} activeFileB={activeFileB} />
                  </div>
                  <div data-test='app-window' style={{ ...commonStyles, ...viewStyles[viewStyleB()].app }}>
                    <iframe src={`${IFRAME_URL}/${appName}`} width='100%' height='100%' frameBorder="0" />
                  </div>
                </Fluent.Stack>
              </>
            )
        }
      </>
    ),
    dispose = () => editor.stopApp()

  return { init, render, viewStyleB, filesB, isLoadingB, activeFileB, dispose }
})