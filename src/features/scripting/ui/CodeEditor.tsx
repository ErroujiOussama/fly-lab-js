import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CodeEditorProps {
  onRunScript: (code: string) => void;
  onStopScript: () => void;
  isRunning: boolean;
  initialCode: string;
}

const defaultCode = `
// Welcome to the Drone Scripting Environment!
// Use the API to control the drone.
// Example: Fly in a square pattern

async function flySquare() {
  console.log("Taking off...");
  await drone.takeoff(3);

  console.log("Flying to first corner...");
  await drone.moveTo(5, 5, 3);

  console.log("Flying to second corner...");
  await drone.moveTo(5, -5, 3);

  console.log("Flying to third corner...");
  await drone.moveTo(-5, -5, 3);

  console.log("Flying back to start...");
  await drone.moveTo(-5, 5, 3);

  console.log("Returning to home...");
  await drone.moveTo(0, 0, 3);

  console.log("Landing...");
  await drone.land();
}

flySquare();
`;

export const CodeEditor: React.FC<CodeEditorProps> = ({ onRunScript, onStopScript, isRunning, initialCode }) => {
  const [code, setCode] = useState<string>(initialCode || defaultCode);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || '');
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <Card className="flex-grow flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Script Editor</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onRunScript(code)}
              disabled={isRunning}
            >
              <Play className="h-4 w-4 mr-2" />
              Run Script
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onStopScript}
              disabled={!isRunning}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Script
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-0">
          <Editor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={code}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Script Output</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded-md p-2 text-xs font-mono overflow-y-auto">
            {/* TODO: Capture and display console.log from the script */}
            <p>Script output will appear here...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
