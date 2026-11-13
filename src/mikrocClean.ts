export const mikroCCleanTarget = `
# Remove only outputs belonging to source files and this project, not supplied libraries.
CLEAN_FILES := $(foreach src,$(basename $(SOURCES_RAW)),$(addprefix $(src),.cp .asm .lst .emcl .mcl .log .user.dic)) $(addprefix $(MODULE),.hex .dbg .dlt .lst .log .mcl .user.dic .mcp32_callertable.txt)

clean:
\t$$ErrorActionPreference = 'Stop'; foreach ($$file in "$(CLEAN_FILES)".Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)) { if (Test-Path -LiteralPath $$file -PathType Leaf) { Remove-Item -LiteralPath $$file -Force } }; if (Test-Path -LiteralPath "bins\\$(MODULE).hex" -PathType Leaf) { Remove-Item -LiteralPath "bins\\$(MODULE).hex" -Force }
\tWrite-Host "Clean complete."
`;
