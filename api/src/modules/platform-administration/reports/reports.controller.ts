import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { GROUP_REPORT_RESOURCES } from '../../../common/authz/product-group.js';
import { ReportsService } from './reports.service.js';

const RESOURCE_BY_PARAM = new Map(GROUP_REPORT_RESOURCES.map((resource) => [resource.param, resource] as const));

/**
 * The nine group reports (ADR-0103 D1): one `view`/`export`/`print` route per
 * product group. Users & Access carries no route here — it is the tenth
 * domain, and Q-A excludes it from reports entirely.
 *
 * `@RequirePermission` needs a literal string argument, so each of the 27
 * pairs gets its own method rather than one `:group` route computing the
 * resourceType at request time: `permission-catalogue.spec.ts` and
 * `permission-resources.spec.ts` scan the source text for exactly that
 * literal shape, and a computed resourceType would still read as a dead pair
 * to them despite being enforced. The aggregation itself is Batch 6a; every
 * method below answers the empty envelope that report will fill.
 */
@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('governance')
  @RequirePermission('governanceReports', 'ViewReports')
  viewGovernance() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('governance')!, 'view');
  }

  @Get('governance/export')
  @RequirePermission('governanceReports', 'Export')
  exportGovernance() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('governance')!, 'export');
  }

  @Get('governance/print')
  @RequirePermission('governanceReports', 'Print')
  printGovernance() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('governance')!, 'print');
  }

  @Get('people')
  @RequirePermission('peopleReports', 'ViewReports')
  viewPeople() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('people')!, 'view');
  }

  @Get('people/export')
  @RequirePermission('peopleReports', 'Export')
  exportPeople() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('people')!, 'export');
  }

  @Get('people/print')
  @RequirePermission('peopleReports', 'Print')
  printPeople() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('people')!, 'print');
  }

  @Get('athletics')
  @RequirePermission('athleticsReports', 'ViewReports')
  viewAthletics() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('athletics')!, 'view');
  }

  @Get('athletics/export')
  @RequirePermission('athleticsReports', 'Export')
  exportAthletics() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('athletics')!, 'export');
  }

  @Get('athletics/print')
  @RequirePermission('athleticsReports', 'Print')
  printAthletics() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('athletics')!, 'print');
  }

  @Get('media')
  @RequirePermission('mediaReports', 'ViewReports')
  viewMedia() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('media')!, 'view');
  }

  @Get('media/export')
  @RequirePermission('mediaReports', 'Export')
  exportMedia() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('media')!, 'export');
  }

  @Get('media/print')
  @RequirePermission('mediaReports', 'Print')
  printMedia() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('media')!, 'print');
  }

  @Get('documents')
  @RequirePermission('documentsReports', 'ViewReports')
  viewDocuments() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('documents')!, 'view');
  }

  @Get('documents/export')
  @RequirePermission('documentsReports', 'Export')
  exportDocuments() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('documents')!, 'export');
  }

  @Get('documents/print')
  @RequirePermission('documentsReports', 'Print')
  printDocuments() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('documents')!, 'print');
  }

  @Get('workflow')
  @RequirePermission('workflowReports', 'ViewReports')
  viewWorkflow() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('workflow')!, 'view');
  }

  @Get('workflow/export')
  @RequirePermission('workflowReports', 'Export')
  exportWorkflow() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('workflow')!, 'export');
  }

  @Get('workflow/print')
  @RequirePermission('workflowReports', 'Print')
  printWorkflow() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('workflow')!, 'print');
  }

  @Get('sponsorship')
  @RequirePermission('sponsorshipReports', 'ViewReports')
  viewSponsorship() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('sponsorship')!, 'view');
  }

  @Get('sponsorship/export')
  @RequirePermission('sponsorshipReports', 'Export')
  exportSponsorship() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('sponsorship')!, 'export');
  }

  @Get('sponsorship/print')
  @RequirePermission('sponsorshipReports', 'Print')
  printSponsorship() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('sponsorship')!, 'print');
  }

  @Get('comms')
  @RequirePermission('commsReports', 'ViewReports')
  viewComms() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('comms')!, 'view');
  }

  @Get('comms/export')
  @RequirePermission('commsReports', 'Export')
  exportComms() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('comms')!, 'export');
  }

  @Get('comms/print')
  @RequirePermission('commsReports', 'Print')
  printComms() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('comms')!, 'print');
  }

  @Get('cms')
  @RequirePermission('cmsReports', 'ViewReports')
  viewCms() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('cms')!, 'view');
  }

  @Get('cms/export')
  @RequirePermission('cmsReports', 'Export')
  exportCms() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('cms')!, 'export');
  }

  @Get('cms/print')
  @RequirePermission('cmsReports', 'Print')
  printCms() {
    return this.service.envelope(RESOURCE_BY_PARAM.get('cms')!, 'print');
  }
}
